// These are the routes for everything under /api/cart.

import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from "../controllers/cartController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Every cart route needs the user to be logged in.
router.use(protect);

// GET the cart, POST to add an item, DELETE to empty the whole cart.
router.route("/").get(getCart).post(addToCart).delete(clearCart);

// PUT to change one item's quantity, DELETE to remove one item.
router.route("/:productId").put(updateCartItem).delete(removeFromCart);

export default router;
