// This file describes how a Product is stored in the database.

import mongoose from "mongoose";

// A single product image. It can be a URL (Cloudinary) or raw data (Buffer).
//
// `attributes` says which variant the photo belongs to. An empty map means the
// photo is generic and can be shown for any variant; { Color: "Deep Navy" }
// means it only ever shows when the shopper has picked Deep Navy. We link by
// attribute value rather than by variant id on purpose: updateProduct rebuilds
// the variants array on every save, so variant ids are not stable, but the
// attribute values are. It also means one set of photos serves every storage
// tier of the same colour without duplicating a single file.
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

// A variant is a version of the product (for example a different color or size).
// A variant does not point at its photos; the photos point at the variant. See
// the note on imageSchema.attributes above.
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
// The storefront's default query: not deleted, active, newest first. Without
// this the listing sorts in memory on every catalog page and every home rail.
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
