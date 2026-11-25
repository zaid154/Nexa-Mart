import express from "express";
import { createRazorpayOrder, verifyPayment, razorpayWebhook } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/webhook", razorpayWebhook);
router.post("/razorpay/:orderId", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);

export default router;
