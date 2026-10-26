// Coupon schema and per-user usage tracking.

import mongoose from "mongoose";

// Per-user usage counter for coupon redemption limits
const couponUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    // Normalized uppercase coupon code
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, default: "" },

    // Discount calculation type: percent or fixed
    type: { type: String, enum: ["percent", "fixed"], default: "percent" },

    // Discount value: percentage or flat amount
    value: { type: Number, required: [true, "Discount value is required"], min: 0 },

    // Minimum subtotal required for coupon eligibility
    minOrderAmount: { type: Number, default: 0, min: 0 },

    // Maximum discount cap for percentage discounts (0 = uncapped)
    maxDiscount: { type: Number, default: 0, min: 0 },

    // Global redemption limit (null = unlimited)
    usageLimit: { type: Number, default: null },

    // Total redemption count across all customers
    usedCount: { type: Number, default: 0 },

    // Per-user usage limit (null = unlimited)
    perUserLimit: { type: Number, default: 1 },

    // Per-user redemption tracking
    usedBy: [couponUsageSchema],

    // Validity schedule
    startsAt: { type: Date },
    expiresAt: { type: Date },

    // Active status toggle
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
