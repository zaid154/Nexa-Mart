import asyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Settings from "../models/settingsModel.js";
import { logActivity } from "../utils/loggerUtils.js";
import { validateCoupon, recordCouponUse, releaseCouponUse } from "../utils/couponUtils.js";
import { adjustStock, buildReturnImageUrls, canCancel, canReturn, RETURN_REASONS } from "../services/orderService.js";
import { buildImageUrls } from "../utils/productViewUtils.js";

// Fetch current commerce pricing rules from settings
const getPricingRules = async () => {
  const settings = await Settings.getSingleton();
  const commerce = settings.commerce || {};
  return {
    taxRate: (commerce.taxRatePercent ?? 18) / 100,
    shippingFee: commerce.shippingFee ?? 99,
    freeShippingThreshold: commerce.freeShippingThreshold ?? 5000,
    codEnabled: commerce.codEnabled !== false,
    onlinePaymentEnabled: commerce.onlinePaymentEnabled !== false,
  };
};

// Shape order object for client response with robust price aliases
const orderToView = (req, order) => {
  const obj = order.toObject ? order.toObject() : order;
  const returnImages = buildReturnImageUrls(req, order);

  let returnInfo = obj.returnInfo;
  if (returnInfo) {
    returnInfo = { ...returnInfo, imageUrls: returnImages };
  }

  const items = (obj.items || []).map((item) => {
    const isPopulated = item.product && typeof item.product === "object" && item.product._id;
    const prodId = isPopulated ? item.product._id : item.product;
    const prodImages = isPopulated ? buildImageUrls(req, item.product) : [];
    const directUrl = isPopulated && (item.product.images?.[0]?.url || (typeof item.product.images?.[0] === "string" ? item.product.images[0] : null));
    const imgUrl = item.image || prodImages[0] || directUrl || null;
    return {
      ...item,
      product: prodId,
      productId: prodId,
      image: imgUrl,
    };
  });

  const totalPrice = obj.totalPrice ?? obj.totalAmount ?? 0;
  const itemsPrice = obj.itemsPrice ?? obj.subtotal ?? 0;
  const shippingPrice = obj.shippingPrice ?? obj.shippingFee ?? 0;
  const discountPrice = obj.discountPrice ?? obj.discount ?? 0;

  return {
    ...obj,
    items,
    returnInfo,
    totalPrice,
    totalAmount: totalPrice,
    itemsPrice,
    subtotal: itemsPrice,
    shippingPrice,
    shippingFee: shippingPrice,
    discountPrice,
    discount: discountPrice,
  };
};

// POST /api/orders - Create new order from user's cart
export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, couponCode, paymentMethod = "razorpay", idempotencyKey } = req.body;

  const pricing = await getPricingRules();
  const allowed = [];
  if (pricing.onlinePaymentEnabled) allowed.push("razorpay");
  if (pricing.codEnabled) allowed.push("cod");

  if (!allowed.includes(paymentMethod)) {
    res.status(400);
    throw new Error("Selected payment method is currently disabled");
  }

  // Prevent duplicate order creation on network retries
  if (idempotencyKey) {
    const existing = await Order.findOne({ user: req.user._id, idempotencyKey });
    if (existing) {
      return res.status(200).json({ order: orderToView(req, existing) });
    }
  }

  const user = await User.findById(req.user._id).populate("cart.product");
  const cartItems = (user.cart || []).filter((i) => i.product && !i.product.isDeleted);

  if (cartItems.length === 0) {
    res.status(400);
    throw new Error("Your cart is empty");
  }

  // Build item breakdown and verify stock
  const orderItems = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const prod = item.product;
    const price = prod.price || 0;
    const stock = prod.countInStock || 0;

    if (stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for "${prod.name}"`);
    }

    orderItems.push({
      product: prod._id,
      image: prod.images?.[0]?.url || (typeof prod.images?.[0] === "string" ? prod.images[0] : "") || prod.image || "",
      name: prod.name,
      price,
      quantity: item.quantity,
    });

    subtotal += price * item.quantity;
  }

  // Validate coupon discount if supplied
  let discount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    try {
      const result = await validateCoupon({
        code: couponCode,
        itemsPrice: subtotal,
        userId: req.user._id,
      });
      discount = result.discount;
      appliedCoupon = result.coupon;
    } catch (err) {
      res.status(400);
      throw err;
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shippingFee = discountedSubtotal >= pricing.freeShippingThreshold ? 0 : pricing.shippingFee;
  const totalPrice = discountedSubtotal + shippingFee;
  const initialStatus = paymentMethod === "cod" ? "confirmed" : "pending";

  const order = new Order({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    paymentMethod,
    isPaid: false,
    status: initialStatus,
    itemsPrice: subtotal,
    discountPrice: discount,
    shippingPrice: shippingFee,
    taxPrice: 0,
    couponCode: appliedCoupon?.code || couponCode || "",
    totalPrice,
    idempotencyKey,
    trackingHistory: [{ status: initialStatus, note: "Order placed" }],
  });

  // Atomically adjust product stock
  await adjustStock(order, "reduce");

  try {
    await order.save();
  } catch (err) {
    await adjustStock(order, "restore");
    throw err;
  }

  if (appliedCoupon) {
    await recordCouponUse(appliedCoupon, req.user._id);
  }

  // Clear user cart upon successful order creation
  user.cart = [];
  await user.save();

  logActivity(req, "order_created", { orderId: order._id, totalPrice, paymentMethod });
  res.status(201).json({ order: orderToView(req, order) });
});

// GET /api/orders - Get user's order history
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate("items.product", "name images price")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ orders: orders.map((o) => orderToView(req, o)) });
});

// GET /api/orders/:id - Get detailed order by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("items.product", "name images price")
    .lean();

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = String(order.user) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("Access denied");
  }

  res.json({ order: orderToView(req, order) });
});

// PUT /api/orders/:id/cancel - Cancel pending order
export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (String(order.user) !== String(req.user._id) && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied");
  }

  if (!canCancel(order.status)) {
    res.status(400);
    throw new Error(`Cannot cancel order in "${order.status}" status`);
  }

  // Restore inventory
  await adjustStock(order, "restore");
  if (order.couponCode) {
    await releaseCouponUse(order.couponCode, order.user);
  }

  order.status = "cancelled";
  order.trackingHistory.push({ status: "cancelled", note: "Cancelled by user" });
  await order.save();

  logActivity(req, "order_cancelled", { orderId: order._id });
  res.json({ order: orderToView(req, order) });
});

// POST /api/orders/:id/return - Request return for delivered order
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

  if (String(order.user) !== String(req.user._id) && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied");
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
  logActivity(req, "return_requested", { orderId: order._id });
  res.json({ order: orderToView(req, order) });
});

// GET /api/orders/:id/return-image/:imageId - Serve uploaded return proof image
export const getReturnImage = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isOwner = String(order.user) === String(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Access denied");
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

// GET /api/orders/return-reasons - Get list of valid return reasons
export const getReturnReasons = (req, res) => {
  res.json({ reasons: RETURN_REASONS });
};
