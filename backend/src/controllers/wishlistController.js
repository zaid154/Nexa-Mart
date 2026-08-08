// This controller handles the wishlist (saved products) for a logged-in user.

import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { productToView } from "../utils/productView.js";

// Build the wishlist as a clean list of product views.
const buildWishlist = async (req, userId) => {
  const user = await User.findById(userId).populate({
    path: "wishlist",
    select: "-images.data",
  });

  // Drop any missing products and convert the rest to the view shape.
  return user.wishlist.filter(Boolean).map((p) => productToView(req, p));
};

// GET /api/wishlist  - get the wishlist.
export const getWishlist = asyncHandler(async (req, res) => {
  res.json({ wishlist: await buildWishlist(req, req.user._id) });
});

// POST /api/wishlist  - add a product to the wishlist.
export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const user = await User.findById(req.user._id);

  // Only add it if it is not already in the wishlist.
  const alreadyThere = user.wishlist.some((id) => id.toString() === productId);
  if (!alreadyThere) {
    user.wishlist.push(productId);
    await user.save();
  }

  res.status(201).json({ wishlist: await buildWishlist(req, req.user._id) });
});

// DELETE /api/wishlist/:productId  - remove a product from the wishlist.
export const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.productId);
  await user.save();
  res.json({ wishlist: await buildWishlist(req, req.user._id) });
});
