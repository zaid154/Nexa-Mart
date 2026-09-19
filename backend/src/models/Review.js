// Product review schema and aggregated rating calculation.

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

// Enforce one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Recalculate average rating and review count on associated product
reviewSchema.statics.recalcProductRating = async function (productId) {
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

  let numReviews = 0;
  let avgRating = 0;
  if (stats[0]) {
    numReviews = stats[0].numReviews;
    avgRating = stats[0].avgRating;
  }

  await Product.findByIdAndUpdate(productId, {
    numReviews,
    rating: Math.round(avgRating * 10) / 10,
  });
};

// Post-save hook to refresh product rating
reviewSchema.post("save", function () {
  this.constructor.recalcProductRating(this.product);
});

// Post-delete hook to refresh product rating
reviewSchema.post("findOneAndDelete", function (doc) {
  if (doc) {
    doc.constructor.recalcProductRating(doc.product);
  }
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
