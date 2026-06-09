// These are the routes for everything under /api/payment.

import express from "express";
import { createRazorpayOrder, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Create a Razorpay order, then verify the payment afterwards.
// Both require the user to be logged in.
router.post("/razorpay/:orderId", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);

export default router;
