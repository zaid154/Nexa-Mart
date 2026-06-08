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

const SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 99;
const TAX_RATE = 0.18;
const COUPONS = { NEXA15: 0.15, WELCOME10: 0.1 };

const orderToView = (req, order) => {
  const obj = order.toObject ? order.toObject() : order;
  const returnImages = buildReturnImageUrls(req, order);
  return {
    ...obj,
    returnInfo: obj.returnInfo
      ? { ...obj.returnInfo, imageUrls: returnImages }
      : obj.returnInfo,
  };
};

export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, couponCode, paymentMethod = "razorpay" } = req.body;

  if (!["razorpay", "cod"].includes(paymentMethod)) {
    res.status(400);
    throw new Error("Invalid payment method");
  }

  const user = await User.findById(req.user._id).populate("cart.product");
  const cartItems = user.cart.filter((i) => i.product);

  if (cartItems.length === 0) {
    res.status(400);
    throw new Error("Cart is empty");
  }

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

  const itemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const code = (couponCode || "").trim().toUpperCase();
  const discountRate = COUPONS[code] || 0;
  const discountPrice = Math.round(itemsPrice * discountRate);
  const discountedItems = itemsPrice - discountPrice;

  const shippingPrice = discountedItems >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const taxPrice = Math.round(discountedItems * TAX_RATE);
  const totalPrice = discountedItems + shippingPrice + taxPrice;

  const isCod = paymentMethod === "cod";
  const initialStatus = isCod ? "confirmed" : "pending";

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
            couponCode: discountRate ? code : "",
            totalPrice,
            paymentMethod,
            status: initialStatus,
            trackingHistory: [
              {
                status: initialStatus,
                note: isCod ? "Order confirmed (Cash on Delivery)" : "Order placed, awaiting payment",
              },
            ],
          },
        ],
        { session }
      );
      order = created[0];

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

export const getMyOrders = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = { user: req.user._id };
  if (status) filter.status = status;

  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json({ orders: orders.map((o) => orderToView(req, o)) });
});

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
  if (!canCancel(order.status)) {
    res.status(400);
    throw new Error("Order can no longer be cancelled");
  }

  order.status = "cancelled";
  order.trackingHistory.push({ status: "cancelled", note: "Cancelled by customer" });

  await adjustStock(order, "restore");

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

export const requestReturn = asyncHandler(async (req, res) => {
  const { reason, description } = req.body;

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
  if (!canReturn(order.status)) {
    res.status(400);
    throw new Error("Return can only be requested for delivered orders");
  }

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

export const getReturnReasons = asyncHandler(async (req, res) => {
  res.json({ reasons: RETURN_REASONS });
});
