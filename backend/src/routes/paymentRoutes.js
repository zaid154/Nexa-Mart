// These are the routes for everything under /api/payment.

import express from "express";
import {
  createRazorpayOrder,
  verifyPayment,
  razorpayWebhook,
} from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Razorpay calls this when a payment or refund event happens. There is no
// login here — the request is trusted only if its signature is valid.
router.post("/webhook", razorpayWebhook);

// Create a Razorpay order, then verify the payment afterwards.
// Both require the user to be logged in.
router.post("/razorpay/:orderId", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);

export default router;
