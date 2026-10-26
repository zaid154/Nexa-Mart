import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Settings from "../models/Settings.js";
import { logActivity } from "../utils/logger.js";
import { validateCoupon, recordCouponUse, releaseCouponUse } from "../utils/coupons.js";
import { adjustStock, buildReturnImageUrls, canCancel, canReturn, RETURN_REASONS } from "../services/orderService.js";
import { buildImageUrls } from "../utils/productView.js";

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

// Shape order object for client response
const orderToView = (req, order) => {
  const obj = order.toObject ? order.toObject() : order;
  const returnImages = buildReturnImageUrls(req, order);

  let returnInfo = obj.returnInfo;
  if (returnInfo) {
    returnInfo = { ...returnInfo, imageUrls: returnImages };
  }

  const items = (obj.items || []).map((item) => {
    const isPopulated = item.product && typeof item.product === "object" && item.product._id;
    if (!isPopulated) return item;
    return {
      ...item,
      product: item.product._id,
      image: buildImageUrls(req, item.product)[0] || null,
    };
  });

  return { ...obj, items, returnInfo };
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
    const variant = item.variant ? prod.variants.id(item.variant) : null;
    const price = variant?.price ?? prod.price;
    const stock = variant ? variant.countInStock : prod.countInStock;

    if (stock < item.quantity) {
      res.status(400);
      throw new Error(`Insufficient stock for "${prod.name}"`);
    }

    orderItems.push({
      product: prod._id,
      variant: variant ? variant._id : undefined,
      variantName: variant?.name || Object.entries(variant?.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(", "),
      sku: variant?.sku || prod.sku,
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
    const result = await validateCoupon(couponCode, subtotal, req.user._id);
    if (result.valid) {
      discount = result.discount;
      appliedCoupon = result.coupon;
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shippingFee = discountedSubtotal >= pricing.freeShippingThreshold ? 0 : pricing.shippingFee;
  const totalAmount = discountedSubtotal + shippingFee;

  // Atomically adjust product stock
  await adjustStock(orderItems, "decrement");

  let order;
  try {
    order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      isPaid: false,
      status: "placed",
      subtotal,
      discount,
      shippingFee,
      totalAmount,
      coupon: appliedCoupon?._id,
      idempotencyKey,
    });
  } catch (err) {
    await adjustStock(orderItems, "increment");
    throw err;
  }

  if (appliedCoupon) {
    await recordCouponUse(appliedCoupon, req.user._id, order._id);
  }

  // Clear user cart upon successful order creation
  user.cart = [];
  await user.save();

  logActivity(req, "order_created", { orderId: order._id, totalAmount, paymentMethod });
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

  if (!canCancel(order)) {
    res.status(400);
    throw new Error(`Cannot cancel order in "${order.status}" status`);
  }

  // Restore inventory
  await adjustStock(order.items, "increment");
  if (order.coupon) {
    await releaseCouponUse(order.coupon, order.user, order._id);
  }

  order.status = "cancelled";
  order.statusHistory.push({ status: "cancelled", note: "Cancelled by user" });
  await order.save();

  logActivity(req, "order_cancelled", { orderId: order._id });
  res.json({ order: orderToView(req, order) });
});

// GET /api/orders/return-reasons - Get list of valid return reasons
export const getReturnReasons = (req, res) => {
  res.json({ reasons: RETURN_REASONS });
};
