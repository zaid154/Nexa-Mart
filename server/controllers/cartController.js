import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { productToView } from "../utils/productViewUtils.js";

// Build formatted cart response with subtotal and item count
const buildCartResponse = async (req, userId) => {
  const user = await User.findById(userId).populate({
    path: "cart.product",
    select: "-images.data",
  });

  const items = (user.cart || [])
    .filter((i) => i.product)
    .map((i) => {
      const unitPrice = i.product.price || 0;
      return {
        product: productToView(req, i.product),
        quantity: i.quantity,
        unitPrice,
        lineTotal: unitPrice * i.quantity,
      };
    });

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, count };
};

// GET /api/cart - Get user's cart
export const getCart = asyncHandler(async (req, res) => {
  const cart = await buildCartResponse(req, req.user._id);
  res.json(cart);
});

// POST /api/cart - Add item to cart
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const stock = product.countInStock || 0;
  if (stock < 1) {
    res.status(400);
    throw new Error("Item is out of stock");
  }

  const user = await User.findById(req.user._id);
  const existingIndex = user.cart.findIndex(
    (i) => String(i.product) === String(productId)
  );

  const desiredQty = existingIndex > -1 ? user.cart[existingIndex].quantity + Number(quantity) : Number(quantity);

  if (desiredQty > stock) {
    res.status(400);
    throw new Error(`Only ${stock} items available in stock`);
  }

  if (existingIndex > -1) {
    user.cart[existingIndex].quantity = desiredQty;
  } else {
    user.cart.push({ product: productId, quantity: Number(quantity) });
  }

  await user.save();
  const cart = await buildCartResponse(req, req.user._id);
  res.status(200).json(cart);
});

// PUT /api/cart/:productId - Update item quantity
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { productId } = req.params;

  if (!quantity || quantity < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1");
  }

  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const stock = product.countInStock || 0;
  if (quantity > stock) {
    res.status(400);
    throw new Error(`Only ${stock} items available in stock`);
  }

  const user = await User.findById(req.user._id);
  const index = user.cart.findIndex(
    (i) => String(i.product) === String(productId)
  );

  if (index === -1) {
    res.status(404);
    throw new Error("Item not found in cart");
  }

  user.cart[index].quantity = Number(quantity);
  await user.save();

  const cart = await buildCartResponse(req, req.user._id);
  res.json(cart);
});

// DELETE /api/cart/:productId - Remove item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter(
    (i) => String(i.product) !== String(productId)
  );

  await user.save();
  const cart = await buildCartResponse(req, req.user._id);
  res.json(cart);
});

// DELETE /api/cart - Clear whole cart
export const clearCart = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.cart = [];
  await user.save();
  res.json({ items: [], subtotal: 0, count: 0 });
});
