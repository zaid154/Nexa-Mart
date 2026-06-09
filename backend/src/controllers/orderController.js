// This controller handles customer orders:
// placing an order, viewing orders, cancelling, and requesting returns.

import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { logActivity } from "../utils/logger.js";
import {
  adjustStock,
  buildReturnImageUrls,
  canCancel,
  canReturn,
  RETURN_REASONS,
} from "../utils/orderStatus.js";

// Pricing rules used when an order is created.
const SHIPPING_THRESHOLD = 5000; // free shipping above this amount
const SHIPPING_FEE = 99;
const TAX_RATE = 0.18; // 18% tax
const COUPONS = { NEXA15: 0.15, WELCOME10: 0.1 }; // coupon code -> discount %

// Convert an order into the shape the frontend expects,
// adding full URLs for any return images.
const orderToView = (req, order) => {
  let obj;
  if (order.toObject) {
    obj = order.toObject();
  } else {
    obj = order;
  }

  const returnImages = buildReturnImageUrls(req, order);

  // Attach the image URLs to returnInfo if it exists.
  let returnInfo = obj.returnInfo;
  if (returnInfo) {
    returnInfo = { ...returnInfo, imageUrls: returnImages };
  }

  return {
    ...obj,
    returnInfo,
  };
};

// POST /api/orders  - place a new order from the user's cart.
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, couponCode, paymentMethod = "razorpay" } = req.body;

  // Only two payment methods are allowed.
  if (!["razorpay", "cod"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Invalid payment method");
  }

  // Load the user with their full cart product details.
  const user = await User.findById(req.user._id).populate("cart.product");
  const cartItems = user.cart.filter((i) => i.product);

  if (cartItems.length === 0) {
    res.status(400);
    throw new Error("Cart is empty");
  }

  // Build the order items, checking availability and stock as we go.
  const items = [];
  for (const ci of cartItems) {
    const product = ci.product;

    if (!product.isActive || product.status !== "active") {
      res.status(400);
      throw new Error(`${product.name} is no longer available`);
    }

    if (ci.quantity > product.countInStock) {
      res.status(400);
      throw new Error(`Only ${product.countInStock} of ${product.name} in stock`);
    }

    items.push({
      product: product._id,
      name: product.name,
      price: product.price,
      quantity: ci.quantity,
    });
  }

  // Add up the price of all items.
  let itemsPrice = 0;
  for (const i of items) {
    itemsPrice += i.price * i.quantity;
  }

  // Work out the coupon discount (if the code is valid).
  const code = (couponCode || "").trim().toUpperCase();
  const discountRate = COUPONS[code] || 0;
  const discountPrice = Math.round(itemsPrice * discountRate);
  const discountedItems = itemsPrice - discountPrice;

  // Shipping is free above the threshold, otherwise a flat fee.
  let shippingPrice;
  if (discountedItems >= SHIPPING_THRESHOLD) {
    shippingPrice = 0;
  } else {
    shippingPrice = SHIPPING_FEE;
  }

  // Tax and final total.
  const taxPrice = Math.round(discountedItems * TAX_RATE);
  const totalPrice = discountedItems + shippingPrice + taxPrice;

  // COD orders are confirmed right away; online orders wait for payment.
  const isCod = paymentMethod === "cod";
  let initialStatus;
  if (isCod) {
    initialStatus = "confirmed";
  } else {
    initialStatus = "pending";
  }

  // The coupon code is only stored if it actually gave a discount.
  let storedCoupon = "";
  if (discountRate) {
    storedCoupon = code;
  }

  // The first tracking note depends on the payment method.
  let firstNote;
  if (isCod) {
    firstNote = "Order confirmed (Cash on Delivery)";
  } else {
    firstNote = "Order placed, awaiting payment";
  }

  // Use a transaction so the order and stock change happen together (for COD).
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      const created = await Order.create(
        [
          {
            user: req.user._id,
            items,
            shippingAddress: shippingAddress || user.address,
            itemsPrice,
            shippingPrice,
            taxPrice,
            discountPrice,
            couponCode: storedCoupon,
            totalPrice,
            paymentMethod,
            status: initialStatus,
            trackingHistory: [
              {
                status: initialStatus,
                note: firstNote,
              },
            ],
          },
        ],
        { session }
      );
      order = created[0];

      // For COD, reduce stock and empty the cart immediately.
      if (isCod) {
        await adjustStock(order, "reduce", session);
        await order.save({ session });
        await User.findByIdAndUpdate(req.user._id, { cart: [] }, { session });
      }
    });
  } finally {
    session.endSession();
  }

  await logActivity({
    type: "order",
    actor: req.user._id,
    action: "order_created",
    meta: { orderId: order._id, total: order.totalPrice },
    ip: req.ip,
  });

  res.status(201).json({ order: orderToView(req, order) });
});

// GET /api/orders/my  - list the logged-in user's orders.
export const getMyOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const filter = { user: req.user._id };
  if (status) {
    filter.status = status;
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json({ orders: orders.map((o) => orderToView(req, o)) });
});

// GET /api/orders/:id  - view a single order (owner or admin only).
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.user._id.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view this order");
  }

  res.json({ order: orderToView(req, order) });
});

// PUT /api/orders/:id/cancel  - cancel an order (owner only).
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  // Only certain statuses can still be cancelled.
  if (!canCancel(order.status)) {
    res.status(400);
    throw new Error("Order can no longer be cancelled");
  }

  order.status = "cancelled";
  order.trackingHistory.push({ status: "cancelled", note: "Cancelled by customer" });

  // Put the stock back.
  await adjustStock(order, "restore");

  // If the order was already paid, mark a refund as pending.
  if (order.isPaid) {
    order.refund = {
      ...order.refund,
      status: "pending",
      amount: order.totalPrice,
      reason: "Order cancelled by customer",
    };
  }

  await order.save();
  res.json({ order: orderToView(req, order) });
});

// POST /api/orders/:id/return  - request a return for a delivered order.
export const requestReturn = asyncHandler(async (req, res) => {
  const { reason, description } = req.body;

  // The reason must be one of the allowed return reasons.
  if (!reason || !RETURN_REASONS.includes(reason)) {
    res.status(400);
    throw new Error("Valid return reason is required");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  // Returns are only allowed for delivered orders.
  if (!canReturn(order.status)) {
    res.status(400);
    throw new Error("Return can only be requested for delivered orders");
  }

  // Save any uploaded proof images.
  const images = (req.files || []).map((file) => ({
    data: file.buffer,
    contentType: file.mimetype,
  }));

  order.status = "return_requested";
  order.returnInfo = {
    reason,
    description: description || "",
    images,
    requestedAt: new Date(),
  };
  order.trackingHistory.push({
    status: "return_requested",
    note: `Return requested: ${reason}`,
  });

  await order.save();
  res.json({ order: orderToView(req, order) });
});

// GET /api/orders/:id/return-image/:imageId  - serve a return image.
export const getReturnImage = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = order.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized");
  }

  const image = order.returnInfo?.images?.id(req.params.imageId);
  if (!image) {
    res.status(404);
    throw new Error("Image not found");
  }

  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(image.data);
});

// GET /api/orders/return-reasons  - the list of allowed return reasons.
export const getReturnReasons = asyncHandler(async (req, res) => {
  res.json({ reasons: RETURN_REASONS });
});
