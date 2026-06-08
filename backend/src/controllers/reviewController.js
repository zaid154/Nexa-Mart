import asyncHandler from "express-async-handler";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 });
  res.json({ reviews });
});

export const createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const { productId } = req.params;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const hasPurchased = await Order.exists({
    user: req.user._id,
    "items.product": productId,
    isPaid: true,
  });
  if (!hasPurchased) {
    res.status(403);
    throw new Error("You can only review products you have purchased");
  }

  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) {
    existing.rating = rating;
    existing.comment = comment ?? existing.comment;
    await existing.save();
    return res.json({ review: existing, message: "Review updated" });
  }

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    name: req.user.name,
    rating,
    comment,
  });

  res.status(201).json({ review, message: "Review added" });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to delete this review");
  }

  await Review.findOneAndDelete({ _id: review._id });
  res.json({ message: "Review removed" });
});
