// This controller handles product reviews (read, create/update, delete).

import asyncHandler from "express-async-handler";
import Review from "../models/reviewModel.js";
import Product from "../models/productModel.js";
import Order from "../models/orderModel.js";

// GET /api/reviews/product/:productId  - all reviews for a product.
export const getProductReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).sort({ createdAt: -1 });
  res.json({ reviews });
});

// GET /api/reviews/product/:productId/eligibility - check if user can review this product
export const checkReviewEligibility = asyncHandler(async (req, res) => {
  const productId = req.params.productId || req.params.id;

  if (!req.user) {
    return res.json({ eligible: false, reason: "Please sign in to rate or review." });
  }

  // The user can only review if they have received delivery of this product
  const hasDelivered = await Order.exists({
    user: req.user._id,
    "items.product": productId,
    status: "delivered",
  });

  if (!hasDelivered) {
    return res.json({
      eligible: false,
      reason: "Only customers who have received delivery of this product can rate or review it.",
    });
  }

  const existing = await Review.findOne({ product: productId, user: req.user._id });

  res.json({
    eligible: true,
    hasReviewed: Boolean(existing),
    existingReview: existing || null,
  });
});

// POST /api/reviews/product/:productId  - add or update a review.
export const createReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.productId || req.params.id;

  // Rating must be a number from 1 to 5.
  if (!rating || rating < 1 || rating > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // The user can only review a product if they have an order containing it that has been delivered.
  const hasDelivered = await Order.exists({
    user: req.user._id,
    "items.product": productId,
    status: "delivered",
  });
  if (!hasDelivered) {
    res.status(403);
    throw new Error("Only customers who have received delivery of this product can rate or review it.");
  }

  // If the user already reviewed this product, update that review instead.
  const existing = await Review.findOne({ product: productId, user: req.user._id });
  if (existing) {
    existing.rating = rating;
    if (comment !== undefined && comment !== null) {
      existing.comment = comment;
    }
    await existing.save();
    return res.json({ review: existing, message: "Review updated" });
  }

  // Otherwise create a brand new review.
  const review = await Review.create({
    product: productId,
    user: req.user._id,
    name: req.user.name,
    rating,
    comment,
  });

  res.status(201).json({ review, message: "Review added" });
});

// DELETE /api/reviews/:id  - delete a review (owner or admin only).
export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    res.status(404);
    throw new Error("Review not found");
  }

  // Only the review's author or an admin can delete it.
  const isOwner = review.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("Not authorized to delete this review");
  }

  await Review.findOneAndDelete({ _id: review._id });
  res.json({ message: "Review removed" });
});
