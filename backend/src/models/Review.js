// This file describes how a product Review is stored.
// It also keeps each product's average rating up to date.

import mongoose from "mongoose";
import Product from "./Product.js";

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },
  },
  { timestamps: true }
);

// One review per user per product.
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Recalculate the product's average rating and review count.
reviewSchema.statics.recalcProductRating = async function (productId) {
  // Group all reviews for this product and find the count and average.
  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        numReviews: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  // If there are no reviews, use 0 for both values.
  let numReviews = 0;
  let avgRating = 0;
  if (stats[0]) {
    numReviews = stats[0].numReviews;
    avgRating = stats[0].avgRating;
  }

  // Save the new numbers on the product (rating rounded to 1 decimal place).
  await Product.findByIdAndUpdate(productId, {
    numReviews,
    rating: Math.round(avgRating * 10) / 10,
  });
};

// After a review is saved, refresh the product rating.
reviewSchema.post("save", function () {
  this.constructor.recalcProductRating(this.product);
});

// After a review is deleted, refresh the product rating too.
reviewSchema.post("findOneAndDelete", function (doc) {
  if (doc) {
    doc.constructor.recalcProductRating(doc.product);
  }
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
