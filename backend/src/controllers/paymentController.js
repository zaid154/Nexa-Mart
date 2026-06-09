// This controller handles online payments using Razorpay.

import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { getRazorpay, getRazorpayKeys } from "../config/razorpay.js";
import { adjustStock } from "../utils/orderStatus.js";

// POST /api/payment/razorpay/:orderId  - create a Razorpay order to pay for.
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const razorpay = await getRazorpay();

  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only the owner of the order can pay for it.
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  // Cannot pay for an order that is already paid.
  if (order.isPaid) {
    res.status(400);
    throw new Error("Order is already paid");
  }

  // This route is only for online (razorpay) orders.
  if (order.paymentMethod !== "razorpay") {
    res.status(400);
    throw new Error("This order does not use online payment");
  }

  // Create the matching order on Razorpay's side. Amount is in paise.
  const rzpOrder = await razorpay.orders.create({
    amount: Math.round(order.totalPrice * 100),
    currency: "INR",
    receipt: order._id.toString(),
    notes: { appOrderId: order._id.toString() },
  });

  // Remember the Razorpay order id on our order.
  order.paymentResult = { ...order.paymentResult, razorpayOrderId: rzpOrder.id };
  await order.save();

  // Send back what the frontend needs to open the Razorpay checkout.
  const { keyId } = await getRazorpayKeys();
  res.json({
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId,
  });
});

// POST /api/payment/verify  - verify the payment signature after checkout.
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Only the owner of the order can verify its payment.
  if (order.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized");
  }

  // Build the expected signature using our secret key.
  const { keySecret } = await getRazorpayKeys();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  // If the signature does not match, the payment is not trustworthy.
  if (expected !== razorpaySignature) {
    order.paymentResult = { ...order.paymentResult, status: "failed" };
    await order.save();
    res.status(400);
    throw new Error("Payment verification failed");
  }

  // Payment is valid: mark the order as paid and confirmed.
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

  // Reduce stock for the ordered items and clear the user's cart.
  await adjustStock(order, "reduce");
  await order.save();
  await User.findByIdAndUpdate(req.user._id, { cart: [] });

  res.json({ message: "Payment verified", order });
});
