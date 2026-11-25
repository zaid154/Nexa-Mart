import express from "express";
import { getProductReviews, createReview, deleteReview, checkReviewEligibility } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/product/:productId", getProductReviews);
router.get("/product/:productId/eligibility", protect, checkReviewEligibility);
router.post("/product/:productId", protect, createReview);
router.delete("/:id", protect, deleteReview);

export default router;
