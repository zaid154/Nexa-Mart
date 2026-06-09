// These are the routes for everything under /api/products.

import express from "express";
import {
  getProducts,
  getAdminProducts,
  getCategoryAttributeTemplates,
  getFilters,
  getProductById,
  getProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect, admin } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Public read routes.
router.get("/", getProducts);
router.get("/filters", getFilters);
router.get("/category-attributes", getCategoryAttributeTemplates);

// Admin-only product list (must be logged in as admin).
router.get("/admin/list", protect, admin, getAdminProducts);

// Single product. optionalAuth lets admins also see draft products.
router.get("/:id", optionalAuth, getProductById);
router.get("/:id/image/:imageId", getProductImage);

// Admin-only write routes. "upload" handles up to 6 images.
router.post("/", protect, admin, upload.array("images", 6), createProduct);
router.put("/:id", protect, admin, upload.array("images", 6), updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

export default router;
