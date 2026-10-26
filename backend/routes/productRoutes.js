import express from "express";
import {
  getProducts, getCollections, getAdminProducts, getCategoryAttributeTemplates,
  getFilters, getProductById, getProductImage, createProduct, updateProduct, deleteProduct
} from "../controllers/productController.js";
import { createReview } from "../controllers/reviewController.js";
import { protect, admin } from "../middleware/authMiddleware.js";
import { optionalAuth } from "../middleware/optionalAuthMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Public catalog routes
router.get("/", getProducts);
router.get("/collections", getCollections);
router.get("/filters", getFilters);
router.get("/category-attributes", getCategoryAttributeTemplates);
router.get("/:id", optionalAuth, getProductById);
router.get("/:id/image/:imageId", getProductImage);
router.post("/:id/reviews", protect, createReview);

// Admin product management routes
router.get("/admin/list", protect, admin, getAdminProducts);
router.post("/", protect, admin, upload.array("images", 24), createProduct);
router.put("/:id", protect, admin, upload.array("images", 24), updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

export default router;
