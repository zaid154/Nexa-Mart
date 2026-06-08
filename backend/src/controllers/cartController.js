import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { productToView } from "../utils/productView.js";

const buildCartResponse = async (req, userId) => {
  const user = await User.findById(userId).populate({
    path: "cart.product",
    select: "-images.data",
  });

  const items = user.cart
    .filter((i) => i.product)
    .map((i) => ({
      product: productToView(req, i.product),
      quantity: i.quantity,
      lineTotal: i.product.price * i.quantity,
    }));

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  return { items, subtotal, count: items.reduce((n, i) => n + i.quantity, 0) };
};

export const getCart = asyncHandler(async (req, res) => {
  res.json(await buildCartResponse(req, req.user._id));
});

export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  const user = await User.findById(req.user._id);
  const existing = user.cart.find((i) => i.product.toString() === productId);

  const desiredQty = (existing ? existing.quantity : 0) + Number(quantity);
  if (desiredQty > product.countInStock) {
    res.status(400);
    throw new Error(`Only ${product.countInStock} in stock`);
  }

  if (existing) {
    existing.quantity = desiredQty;
  } else {
    user.cart.push({ product: productId, quantity: Number(quantity) });
  }
  await user.save();

  res.status(201).json(await buildCartResponse(req, req.user._id));
});

export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  if (quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }
  if (quantity > product.countInStock) {
    res.status(400);
    throw new Error(`Only ${product.countInStock} in stock`);
  }

  const user = await User.findById(req.user._id);
  const item = user.cart.find((i) => i.product.toString() === productId);
  if (!item) {
    res.status(404);
    throw new Error("Item not in cart");
  }
  item.quantity = Number(quantity);
  await user.save();

  res.json(await buildCartResponse(req, req.user._id));
});

export const removeFromCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter((i) => i.product.toString() !== req.params.productId);
  await user.save();
  res.json(await buildCartResponse(req, req.user._id));
});

export const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = [];
  await user.save();
  res.json(await buildCartResponse(req, req.user._id));
});
