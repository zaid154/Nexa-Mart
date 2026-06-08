import express from "express";
import { createRazorpayOrder, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/razorpay/:orderId", protect, createRazorpayOrder);
router.post("/verify", protect, verifyPayment);

export default router;
