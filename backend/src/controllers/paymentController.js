import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { getRazorpay, getRazorpayKeys } from "../config/razorpay.js";
import { adjustStock } from "../utils/orderStatus.js";

export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const razorpay = await getRazorpay();

  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }
  if (order.isPaid) {
    res.status(400);
    throw new Error("Order is already paid");
  }
  if (order.paymentMethod !== "razorpay") {
    res.status(400);
    throw new Error("This order does not use online payment");
  }

  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(order.totalPrice * 100),
    currency: "INR",
    receipt: order._id.toString(),
    notes: { appOrderId: order._id.toString() },
  });

  order.paymentResult = { ...order.paymentResult, razorpayOrderId: rzpOrder.id };
  await order.save();

  const { keyId } = await getRazorpayKeys();
  res.json({
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId,
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  const { keySecret } = await getRazorpayKeys();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expected !== razorpaySignature) {
    order.paymentResult = { ...order.paymentResult, status: "failed" };
    await order.save();
    res.status(400);
    throw new Error("Payment verification failed");
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.status = "confirmed";
  order.paymentResult = {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    status: "paid",
  };
  order.trackingHistory.push({ status: "confirmed", note: "Payment received" });

  await adjustStock(order, "reduce");
  await order.save();
  await User.findByIdAndUpdate(req.user._id, { cart: [] });

  res.json({ message: "Payment verified", order });
});
