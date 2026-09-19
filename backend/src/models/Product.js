// This file describes how a Product is stored in the database.

import mongoose from "mongoose";

// Product image schema with optional variant attribute mappings
const imageSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
    data: { type: Buffer },
    contentType: { type: String },
    attributes: { type: Map, of: String, default: {} },
    // Intrinsic size, so the frontend can reserve the box and avoid layout shift.
    width: { type: Number },
    height: { type: Number },
    // Prebuilt responsive sources. Only set for images we processed ourselves;
    // Cloudinary and admin-uploaded images leave these empty.
    srcset: { type: String },
    srcsetAvif: { type: String },
  },
  { _id: true }
);

// Product variant schema representing size, color, or other variations
const variantSchema = new mongoose.Schema(
  {
    attributes: { type: Map, of: String, default: {} },
    sku: { type: String, trim: true },
    price: { type: Number, min: 0 },
    countInStock: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

// The main product schema.
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Product name is required"], trim: true },
    slug: { type: String, lowercase: true, index: true },
    sku: { type: String, unique: true, sparse: true, trim: true },
    brand: { type: String, trim: true },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    description: { type: String, default: "" },
    price: { type: Number, required: [true, "Price is required"], min: 0 },
    mrp: { type: Number, min: 0 },
    countInStock: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["active", "draft", "out_of_stock"],
      default: "active",
    },
    images: [imageSchema],
    specs: { type: Map, of: String, default: {} },
    attributes: { type: Map, of: String, default: {} },
    // Per-product benefit bullets shown on the product page (delivery, warranty,
    // returns, secure payment, etc.). Admin sets these per product; clear them
    // to hide the section for a product.
    benefits: {
      type: [String],
      default: [
        "Free delivery in 3–5 business days",
        "1 year manufacturer warranty",
        "7-day easy returns",
        "100% secure payment",
      ],
    },
    variants: [variantSchema],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes to make searching and filtering products faster.
productSchema.index({ name: "text", description: "text", brand: "text", category: "text" });
productSchema.index({ status: 1, category: 1 });
productSchema.index({ name: 1, brand: 1 });
// Compound index for storefront listings: active, non-deleted, sorted by creation date
productSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
productSchema.index({ category: 1, price: 1 });

// Before saving, build a slug and keep the status/stock in sync.
productSchema.pre("save", function (next) {
  // Create a URL-friendly slug from the name if needed.
  if (this.isModified("name") || !this.slug) {
    const baseSlug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const randomPart = Math.random().toString(36).slice(2, 7);
    this.slug = baseSlug + "-" + randomPart;
  }

  // If an active product has no stock, mark it out of stock.
  if (this.status === "active" && this.countInStock <= 0) {
    this.status = "out_of_stock";
  }

  // If an out-of-stock product gets stock again, mark it active.
  if (this.status === "out_of_stock" && this.countInStock > 0) {
    this.status = "active";
  }

  // isActive is true only when the product is active.
  this.isActive = this.status === "active";

  next();
});

const Product = mongoose.model("Product", productSchema);
export default Product;
