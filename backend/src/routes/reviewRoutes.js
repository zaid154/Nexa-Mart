import express from "express";
import {
  getProductReviews,
  createReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/product/:productId", getProductReviews);
router.post("/product/:productId", protect, createReview);
router.delete("/:id", protect, deleteReview);

export default router;
