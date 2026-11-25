import express from "express";
import {
  registerUser, verifyOtp, resendOtp, loginUser, forgotPassword,
  resetPassword, refreshToken, logoutUser, getProfile, updateProfile
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  registerSchema, loginSchema, verifyOtpSchema,
  forgotPasswordSchema, resetPasswordSchema, updateProfileSchema
} from "../validators/authValidators.js";

const router = express.Router();

// Public auth endpoints
router.post("/register", validate(registerSchema), registerUser);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", validate(loginSchema), loginUser);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/refresh", refreshToken);

// Authenticated user profile endpoints
router.post("/logout", protect, logoutUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, validate(updateProfileSchema), updateProfile);

export default router;
