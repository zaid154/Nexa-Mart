// This controller handles online payments using Razorpay.

import asyncHandler from "express-async-handler";
import crypto from "crypto";
import Order from "../models/Order.js";
import User from "../models/User.js";
import {
  getRazorpay,
  getRazorpayKeys,
  getRazorpayWebhookSecret,
} from "../config/razorpay.js";
import { adjustStock } from "../utils/orderStatus.js";

// Mark an order as paid: confirm it, reduce stock and clear the buyer's cart.
// This is shared by the browser verify step and the Razorpay webhook so that
// an order is fulfilled exactly once, no matter which one arrives first.
// Returns true if it changed anything, false if the order was already paid.
const fulfilPaidOrder = async (order, details) => {
  if (order.isPaid) {
    return false;
  }

  order.isPaid = true;
  order.paidAt = new Date();
  if (order.status === "pending") {
    order.status = "confirmed";
  }

  // Record the payment ids without losing the razorpayOrderId set earlier.
  if (!order.paymentResult) {
    order.paymentResult = {};
  }
  if (details.razorpayOrderId) {
    order.paymentResult.razorpayOrderId = details.razorpayOrderId;
  }
  if (details.razorpayPaymentId) {
    order.paymentResult.razorpayPaymentId = details.razorpayPaymentId;
  }
  if (details.razorpaySignature) {
    order.paymentResult.razorpaySignature = details.razorpaySignature;
  }
  order.paymentResult.status = "paid";

  order.trackingHistory.push({ status: order.status, note: "Payment received" });

  // Reduce stock (adjustStock guards against doing this twice).
  await adjustStock(order, "reduce");
  await order.save();
  await User.findByIdAndUpdate(order.user, { cart: [] });
  return true;
};

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

  // Payment is valid: mark the order as paid, confirmed and fulfilled.
  await fulfilPaidOrder(order, {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  res.json({ message: "Payment verified", order });
});

// POST /api/payment/webhook  - receive payment/refund events from Razorpay.
// This is the reliable source of truth: even if the customer closes the browser
// before /verify runs, Razorpay still tells us the payment succeeded.
// There is no login here; we trust the request only if its signature is valid.
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const secret = await getRazorpayWebhookSecret();

  if (!secret) {
    res.status(500);
    throw new Error("Webhook secret is not configured");
  }
  if (!req.rawBody || !signature) {
    res.status(400);
    throw new Error("Missing webhook body or signature");
  }

  // Verify the signature against the exact bytes Razorpay sent.
  const expected = crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (
    expectedBuf.length !== signatureBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, signatureBuf)
  ) {
    res.status(400);
    throw new Error("Invalid webhook signature");
  }

  const event = req.body?.event;
  const payload = req.body?.payload || {};

  // A payment succeeded: make sure the order is marked paid, even if the
  // browser never called /payment/verify (for example the tab was closed).
  if (event === "payment.captured" || event === "order.paid") {
    const payment = payload.payment?.entity;
    const rzpOrderId = payment?.order_id || payload.order?.entity?.id;
    const appOrderId = payment?.notes?.appOrderId;

    let order = null;
    if (appOrderId) {
      order = await Order.findById(appOrderId).catch(() => null);
    }
    if (!order && rzpOrderId) {
      order = await Order.findOne({ "paymentResult.razorpayOrderId": rzpOrderId });
    }

    if (order) {
      await fulfilPaidOrder(order, {
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: payment?.id,
      });
    }
  }

  // A refund finished or failed: update the order's refund status.
  if (event === "refund.processed" || event === "refund.failed") {
    const refund = payload.refund?.entity;
    if (refund?.id) {
      const order = await Order.findOne({ "refund.transactionId": refund.id });
      if (order) {
        order.refund.status = event === "refund.processed" ? "completed" : "failed";
        if (event === "refund.processed") {
          order.refund.completedAt = new Date();
        }
        order.markModified("refund");
        order.trackingHistory.push({
          status: order.status,
          note: `Refund ${order.refund.status} (Razorpay webhook)`,
        });
        await order.save();
      }
    }
  }

  // Always acknowledge so Razorpay does not keep retrying.
  res.json({ received: true });
});
