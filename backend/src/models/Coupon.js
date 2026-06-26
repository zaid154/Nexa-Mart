// This file describes how a discount Coupon is stored in the database.
// Coupons are created and managed by admins (Admin -> Coupons) and applied
// by customers at checkout.

import mongoose from "mongoose";

// Keeps track of how many times a single user has used this coupon
// (so we can enforce a per-user usage limit).
const couponUsageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    count: { type: Number, default: 0 },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    // The code the customer types in, for example "NEXA15". Always stored uppercase.
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, default: "" },

    // "percent" gives a % off; "fixed" gives a flat rupee amount off.
    type: { type: String, enum: ["percent", "fixed"], default: "percent" },

    // For percent: a number like 15 means 15% off.
    // For fixed: a number like 200 means ₹200 off.
    value: { type: Number, required: [true, "Discount value is required"], min: 0 },

    // The smallest cart subtotal (before tax/shipping) needed to use this coupon.
    minOrderAmount: { type: Number, default: 0, min: 0 },

    // For percent coupons, the largest rupee discount allowed (0 = no cap).
    maxDiscount: { type: Number, default: 0, min: 0 },

    // Total number of times this coupon may be used across all users.
    // null means unlimited.
    usageLimit: { type: Number, default: null },

    // How many times this coupon has been used so far (all users).
    usedCount: { type: Number, default: 0 },

    // How many times a single user may use this coupon. null means unlimited.
    perUserLimit: { type: Number, default: 1 },

    // Per-user usage records, used to enforce perUserLimit.
    usedBy: [couponUsageSchema],

    // The window in which the coupon works. Either can be left empty.
    startsAt: { type: Date },
    expiresAt: { type: Date },

    // Admins can turn a coupon off without deleting it.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
