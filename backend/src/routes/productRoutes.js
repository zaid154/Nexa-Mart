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

router.get("/", getProducts);
router.get("/filters", getFilters);
router.get("/category-attributes", getCategoryAttributeTemplates);
router.get("/admin/list", protect, admin, getAdminProducts);
router.get("/:id", optionalAuth, getProductById);
router.get("/:id/image/:imageId", getProductImage);

router.post("/", protect, admin, upload.array("images", 6), createProduct);
router.put("/:id", protect, admin, upload.array("images", 6), updateProduct);
router.delete("/:id", protect, admin, deleteProduct);

export default router;
