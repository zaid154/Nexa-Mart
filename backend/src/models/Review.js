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

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Recalculate the product's aggregate rating whenever reviews change.
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

  const { numReviews = 0, avgRating = 0 } = stats[0] || {};
  await Product.findByIdAndUpdate(productId, {
    numReviews,
    rating: Math.round(avgRating * 10) / 10,
  });
};

reviewSchema.post("save", function () {
  this.constructor.recalcProductRating(this.product);
});

reviewSchema.post("findOneAndDelete", function (doc) {
  if (doc) doc.constructor.recalcProductRating(doc.product);
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
