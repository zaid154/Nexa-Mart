// These are the routes for everything under /api/reviews.

import express from "express";
import {
  getProductReviews,
  createReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Anyone can read the reviews for a product.
router.get("/product/:productId", getProductReviews);

// Logged-in users can add a review or delete one.
router.post("/product/:productId", protect, createReview);
router.delete("/:id", protect, deleteReview);

export default router;
