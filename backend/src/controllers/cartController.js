// This controller handles the shopping cart for a logged-in user.

import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { productToView } from "../utils/productView.js";

// Build a clean cart response: the items, the subtotal and the item count.
const buildCartResponse = async (req, userId) => {
  // Load the user and bring in the full product details for each cart item.
  const user = await User.findById(userId).populate({
    path: "cart.product",
    select: "-images.data",
  });

  // Keep only items whose product still exists, and shape each one.
  const items = user.cart
    .filter((i) => i.product)
    .map((i) => ({
      product: productToView(req, i.product),
      quantity: i.quantity,
      lineTotal: i.product.price * i.quantity,
    }));

  // Subtotal is the sum of all line totals.
  let subtotal = 0;
  for (const i of items) {
    subtotal += i.lineTotal;
  }

  // Count is the total number of units in the cart.
  let count = 0;
  for (const i of items) {
    count += i.quantity;
  }

  return { items, subtotal, count };
};

// GET /api/cart  - get the current cart.
export const getCart = asyncHandler(async (req, res) => {
  res.json(await buildCartResponse(req, req.user._id));
});

// POST /api/cart  - add a product to the cart.
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // The product must exist and be active.
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  const user = await User.findById(req.user._id);

  // Is this product already in the cart?
  const existing = user.cart.find((i) => i.product.toString() === productId);

  // Work out the new total quantity for this product.
  let currentQty = 0;
  if (existing) {
    currentQty = existing.quantity;
  }
  const desiredQty = currentQty + Number(quantity);

  // Do not allow more than what is in stock.
  if (desiredQty > product.countInStock) {
    res.status(400);
    throw new Error(`Only ${product.countInStock} in stock`);
  }

  // Update the existing item, or add a new one.
  if (existing) {
    existing.quantity = desiredQty;
  } else {
    user.cart.push({ product: productId, quantity: Number(quantity) });
  }
  await user.save();

  res.status(201).json(await buildCartResponse(req, req.user._id));
});

// PUT /api/cart/:productId  - change the quantity of a cart item.
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  // Quantity must be at least 1.
  if (quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Do not allow more than what is in stock.
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

// DELETE /api/cart/:productId  - remove one product from the cart.
export const removeFromCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter((i) => i.product.toString() !== req.params.productId);
  await user.save();
  res.json(await buildCartResponse(req, req.user._id));
});

// DELETE /api/cart  - empty the whole cart.
export const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = [];
  await user.save();
  res.json(await buildCartResponse(req, req.user._id));
});
