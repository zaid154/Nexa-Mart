import express from "express";
import { previewCoupon, listCoupons, createCoupon, updateCoupon, deleteCoupon } from "../controllers/couponController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/validate", protect, previewCoupon);
router.get("/", protect, admin, listCoupons);
router.post("/", protect, admin, createCoupon);
router.put("/:id", protect, admin, updateCoupon);
router.delete("/:id", protect, admin, deleteCoupon);

export default router;
