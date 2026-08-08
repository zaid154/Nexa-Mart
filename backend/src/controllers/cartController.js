// This controller handles the shopping cart for a logged-in user.
//
// A product can sell in several configurations (128 GB / 256 GB, Silver /
// Black …). Each cart line therefore remembers which variant was chosen, and
// the price and the stock check both come from that variant rather than from
// the product's headline values.

import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Product from "../models/Product.js";
import { productToView } from "../utils/productView.js";

// Find a variant on a product by its id. Returns null when the product has no
// variants or the id does not belong to it.
const findVariant = (product, variantId) => {
  if (!variantId || !product.variants?.length) {
    return null;
  }
  return product.variants.id(variantId) || null;
};

// What one unit of this line costs, and how many can be sold.
const priceOf = (product, variant) => (variant?.price ?? product.price);
const stockOf = (product, variant) => (variant ? variant.countInStock : product.countInStock);

// Compare two variant ids that may be null, ObjectId or string.
const sameVariant = (a, b) => String(a || "") === String(b || "");

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
    .map((i) => {
      const variant = findVariant(i.product, i.variant);
      const unitPrice = priceOf(i.product, variant);

      return {
        product: productToView(req, i.product),
        variant: variant
          ? {
              _id: variant._id,
              sku: variant.sku,
              price: variant.price,
              countInStock: variant.countInStock,
              attributes: Object.fromEntries(variant.attributes || []),
            }
          : null,
        quantity: i.quantity,
        unitPrice,
        lineTotal: unitPrice * i.quantity,
      };
    });

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

// POST /api/cart  - add a product (optionally a specific variant) to the cart.
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId = null, quantity = 1 } = req.body;

  // The product must exist and be active.
  const product = await Product.findById(productId);
  if (!product || !product.isActive) {
    res.status(404);
    throw new Error("Product not found");
  }

  // If a variant was named it has to belong to this product.
  const variant = findVariant(product, variantId);
  if (variantId && !variant) {
    res.status(400);
    throw new Error("That option is no longer available");
  }

  const user = await User.findById(req.user._id);

  // The same product in a different configuration is a separate cart line.
  const existing = user.cart.find(
    (i) => i.product.toString() === productId && sameVariant(i.variant, variant?._id)
  );

  // Work out the new total quantity for this line.
  let currentQty = 0;
  if (existing) {
    currentQty = existing.quantity;
  }
  const desiredQty = currentQty + Number(quantity);

  // Do not allow more than what is in stock for the chosen option.
  const available = stockOf(product, variant);
  if (desiredQty > available) {
    res.status(400);
    throw new Error(`Only ${available} in stock`);
  }

  // Update the existing line, or add a new one.
  if (existing) {
    existing.quantity = desiredQty;
  } else {
    user.cart.push({
      product: productId,
      variant: variant?._id || null,
      quantity: Number(quantity),
    });
  }
  await user.save();

  res.status(201).json(await buildCartResponse(req, req.user._id));
});

// PUT /api/cart/:productId  - change the quantity of a cart line.
// Pass variantId in the body to target a specific configuration.
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity, variantId = null } = req.body;
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

  const variant = findVariant(product, variantId);

  // Do not allow more than what is in stock for the chosen option.
  const available = stockOf(product, variant);
  if (quantity > available) {
    res.status(400);
    throw new Error(`Only ${available} in stock`);
  }

  const user = await User.findById(req.user._id);
  const item = user.cart.find(
    (i) => i.product.toString() === productId && sameVariant(i.variant, variantId)
  );
  if (!item) {
    res.status(404);
    throw new Error("Item not in cart");
  }

  item.quantity = Number(quantity);
  await user.save();

  res.json(await buildCartResponse(req, req.user._id));
});

// DELETE /api/cart/:productId  - remove one line from the cart.
// Pass ?variantId= to remove a specific configuration.
export const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const variantId = req.query.variantId || null;

  const user = await User.findById(req.user._id);
  user.cart = user.cart.filter(
    (i) => !(i.product.toString() === productId && sameVariant(i.variant, variantId))
  );
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
