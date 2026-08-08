// This controller handles discount coupons:
// - admins create, list, edit and delete coupons
// - customers preview a coupon's discount at checkout

import asyncHandler from "express-async-handler";
import Coupon from "../models/Coupon.js";
import User from "../models/User.js";
import { validateCoupon, normalizeCode } from "../utils/coupons.js";
import { logActivity } from "../utils/logger.js";

// Hide the heavy per-user usage list when returning coupons to the admin UI.
const couponToView = (coupon) => {
  const obj = coupon.toObject ? coupon.toObject() : coupon;
  return {
    _id: obj._id,
    code: obj.code,
    description: obj.description,
    type: obj.type,
    value: obj.value,
    minOrderAmount: obj.minOrderAmount,
    maxDiscount: obj.maxDiscount,
    usageLimit: obj.usageLimit,
    usedCount: obj.usedCount,
    perUserLimit: obj.perUserLimit,
    startsAt: obj.startsAt,
    expiresAt: obj.expiresAt,
    isActive: obj.isActive,
    createdAt: obj.createdAt,
  };
};

// POST /api/coupons/validate  - preview a coupon's discount for the current cart.
// The cart subtotal is calculated on the server, never trusted from the client.
export const previewCoupon = asyncHandler(async (req, res) => {
  const { code } = req.body;

  // Add up the user's current cart subtotal.
  const user = await User.findById(req.user._id).populate("cart.product");
  const cartItems = user.cart.filter((i) => i.product);

  let itemsPrice = 0;
  for (const ci of cartItems) {
    itemsPrice += ci.product.price * ci.quantity;
  }

  let result;
  try {
    result = await validateCoupon({ code, itemsPrice, userId: req.user._id });
  } catch (err) {
    res.status(400);
    throw err;
  }

  res.json({
    code: result.coupon.code,
    type: result.coupon.type,
    value: result.coupon.value,
    discount: result.discount,
    message: `Coupon applied: ₹${result.discount} off`,
  });
});

// GET /api/coupons  - list all coupons (admin).
export const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons: coupons.map(couponToView) });
});

// POST /api/coupons  - create a coupon (admin).
export const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    type,
    value,
    minOrderAmount,
    maxDiscount,
    usageLimit,
    perUserLimit,
    startsAt,
    expiresAt,
    isActive,
  } = req.body;

  const normalized = normalizeCode(code);
  if (!normalized) {
    res.status(400);
    throw new Error("Coupon code is required");
  }

  // Percent coupons cannot be more than 100%.
  if (type === "percent" && Number(value) > 100) {
    res.status(400);
    throw new Error("Percent discount cannot be more than 100");
  }

  // Do not allow two coupons with the same code.
  const exists = await Coupon.findOne({ code: normalized });
  if (exists) {
    res.status(400);
    throw new Error("A coupon with this code already exists");
  }

  const coupon = await Coupon.create({
    code: normalized,
    description: description || "",
    type: type || "percent",
    value: Number(value) || 0,
    minOrderAmount: Number(minOrderAmount) || 0,
    maxDiscount: Number(maxDiscount) || 0,
    usageLimit: usageLimit === "" || usageLimit == null ? null : Number(usageLimit),
    perUserLimit: perUserLimit === "" || perUserLimit == null ? null : Number(perUserLimit),
    startsAt: startsAt || undefined,
    expiresAt: expiresAt || undefined,
    isActive: isActive !== false,
  });

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "coupon_created",
    meta: { code: coupon.code },
    ip: req.ip,
  });

  res.status(201).json({ coupon: couponToView(coupon) });
});

// PUT /api/coupons/:id  - update a coupon (admin).
export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  const fields = req.body;

  // The code, if changed, must stay unique.
  if (fields.code !== undefined) {
    const normalized = normalizeCode(fields.code);
    if (normalized !== coupon.code) {
      const exists = await Coupon.findOne({ code: normalized });
      if (exists) {
        res.status(400);
        throw new Error("A coupon with this code already exists");
      }
    }
    coupon.code = normalized;
  }

  if (fields.description !== undefined) {
    coupon.description = fields.description;
  }
  if (fields.type !== undefined) {
    coupon.type = fields.type;
  }
  if (fields.value !== undefined) {
    coupon.value = Number(fields.value);
  }
  if (fields.minOrderAmount !== undefined) {
    coupon.minOrderAmount = Number(fields.minOrderAmount);
  }
  if (fields.maxDiscount !== undefined) {
    coupon.maxDiscount = Number(fields.maxDiscount);
  }
  if (fields.usageLimit !== undefined) {
    coupon.usageLimit =
      fields.usageLimit === "" || fields.usageLimit == null ? null : Number(fields.usageLimit);
  }
  if (fields.perUserLimit !== undefined) {
    coupon.perUserLimit =
      fields.perUserLimit === "" || fields.perUserLimit == null ? null : Number(fields.perUserLimit);
  }
  if (fields.startsAt !== undefined) {
    coupon.startsAt = fields.startsAt || undefined;
  }
  if (fields.expiresAt !== undefined) {
    coupon.expiresAt = fields.expiresAt || undefined;
  }
  if (fields.isActive !== undefined) {
    coupon.isActive = fields.isActive;
  }

  // Guard against an invalid percent value.
  if (coupon.type === "percent" && coupon.value > 100) {
    res.status(400);
    throw new Error("Percent discount cannot be more than 100");
  }

  await coupon.save();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "coupon_updated",
    meta: { code: coupon.code },
    ip: req.ip,
  });

  res.json({ coupon: couponToView(coupon) });
});

// DELETE /api/coupons/:id  - delete a coupon (admin).
export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }

  await coupon.deleteOne();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "coupon_deleted",
    meta: { code: coupon.code },
    ip: req.ip,
  });

  res.json({ message: "Coupon deleted" });
});
