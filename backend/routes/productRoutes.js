import { createReview } from "../controllers/reviewController.js";
// These are the routes for everything under /api/products.

import express from "express";
import {
  getProducts,
  getCollections,
  getAdminProducts,
  getCategoryAttributeTemplates,
  getFilters,
  getProductById,
  getProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { optionalAuth } from "../middleware/optionalAuthMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public read routes.
router.get("/", getProducts);
// Every homepage rail in one request. Must be declared before "/:id" so the
// word "collections" is not read as a product id.
router.get("/collections", getCollections);
router.get("/filters", getFilters);
router.get("/category-attributes", getCategoryAttributeTemplates);

// Admin-only product list (must be logged in as admin).
router.get("/admin/list", protect, admin, getAdminProducts);

// Single product. optionalAuth lets admins also see draft products.
router.get("/:id", optionalAuth, getProductById);
router.get("/:id/image/:imageId", getProductImage);

// Submit review for single product
router.post("/:id/reviews", protect, createReview);

// Admin product management routes (supports up to 24 images per product)
router.post("/", protect, admin, upload.array("images", 24), createProduct);
router.put("/:id", protect, admin, upload.array("images", 24), updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

export default router;
