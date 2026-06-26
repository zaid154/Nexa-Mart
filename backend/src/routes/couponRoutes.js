// Routes for discount coupons (mounted at /api/coupons).
// "validate" is for any logged-in customer; the rest are admin-only.

import express from "express";
import {
  previewCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

// Customer: preview the discount for a coupon against their own cart.
router.post("/validate", protect, previewCoupon);

// Admin: manage coupons.
router.get("/", protect, admin, listCoupons);
router.post("/", protect, admin, createCoupon);
router.put("/:id", protect, admin, updateCoupon);
router.delete("/:id", protect, admin, deleteCoupon);

export default router;
