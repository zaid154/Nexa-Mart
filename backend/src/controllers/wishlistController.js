import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { productToView } from "../utils/productView.js";

const buildWishlist = async (req, userId) => {
  const user = await User.findById(userId).populate({
    path: "wishlist",
    select: "-images.data",
  });
  return user.wishlist.filter(Boolean).map((p) => productToView(req, p));
};

export const getWishlist = asyncHandler(async (req, res) => {
  res.json({ wishlist: await buildWishlist(req, req.user._id) });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const user = await User.findById(req.user._id);
  if (!user.wishlist.some((id) => id.toString() === productId)) {
    user.wishlist.push(productId);
    await user.save();
  }

  res.status(201).json({ wishlist: await buildWishlist(req, req.user._id) });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.productId);
  await user.save();
  res.json({ wishlist: await buildWishlist(req, req.user._id) });
});
