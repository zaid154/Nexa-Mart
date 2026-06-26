// Helper functions for validating and applying discount coupons.
// These are used both by the checkout preview endpoint and by order creation,
// so the rules live in one place and stay consistent.

import Coupon from "../models/Coupon.js";

// Make a typed coupon code consistent (trimmed + uppercase).
export const normalizeCode = (code) => (code || "").trim().toUpperCase();

// Throw a clear, user-friendly error. The controller that calls validateCoupon
// is responsible for setting res.status(400) before re-throwing.
const fail = (message) => {
  throw new Error(message);
};

// Validate a coupon for a given cart subtotal and user.
// Returns { coupon, discount } where discount is a whole-rupee amount.
// Throws an Error with a clear message if the coupon cannot be used.
export const validateCoupon = async ({ code, itemsPrice, userId }) => {
  const normalized = normalizeCode(code);
  if (!normalized) {
    fail("No coupon code provided");
  }

  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon || !coupon.isActive) {
    fail("Invalid or inactive coupon code");
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    fail("This coupon is not active yet");
  }
  if (coupon.expiresAt && coupon.expiresAt < now) {
    fail("This coupon has expired");
  }

  // The cart must meet the minimum order amount.
  if (itemsPrice < coupon.minOrderAmount) {
    fail(`Add ₹${coupon.minOrderAmount - itemsPrice} more to use this coupon`);
  }

  // The overall usage limit (across all users).
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    fail("This coupon has reached its usage limit");
  }

  // The per-user usage limit.
  if (userId && coupon.perUserLimit != null) {
    const entry = coupon.usedBy.find((u) => u.user.toString() === userId.toString());
    if (entry && entry.count >= coupon.perUserLimit) {
      fail("You have already used this coupon");
    }
  }

  // Work out the discount amount.
  let discount;
  if (coupon.type === "percent") {
    discount = Math.round((itemsPrice * coupon.value) / 100);
    // Apply the maximum discount cap if one is set.
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    // A fixed discount can never be more than the cart subtotal.
    discount = Math.min(coupon.value, itemsPrice);
  }

  return { coupon, discount };
};

// Record that a user successfully used a coupon (called when an order is placed).
export const recordCouponUse = async (coupon, userId) => {
  coupon.usedCount += 1;
  const entry = coupon.usedBy.find((u) => u.user.toString() === userId.toString());
  if (entry) {
    entry.count += 1;
  } else {
    coupon.usedBy.push({ user: userId, count: 1 });
  }
  await coupon.save();
};

// Give a coupon use back (called when an order that used a coupon is cancelled),
// so the customer is not unfairly charged a usage.
export const releaseCouponUse = async (code, userId) => {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return;
  }
  const coupon = await Coupon.findOne({ code: normalized });
  if (!coupon) {
    return;
  }
  if (coupon.usedCount > 0) {
    coupon.usedCount -= 1;
  }
  const entry = coupon.usedBy.find((u) => u.user.toString() === userId.toString());
  if (entry && entry.count > 0) {
    entry.count -= 1;
  }
  await coupon.save();
};
