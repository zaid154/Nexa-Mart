// These are the routes for everything under /api/wishlist.

import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Every wishlist route needs the user to be logged in.
router.use(protect);

// GET the wishlist, POST to add a product.
router.route("/").get(getWishlist).post(addToWishlist);

// DELETE to remove one product from the wishlist.
router.delete("/:productId", removeFromWishlist);

export default router;
