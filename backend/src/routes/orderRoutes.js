// These are the routes for everything under /api/orders.

import express from "express";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  requestReturn,
  getReturnImage,
  getReturnReasons,
} from "../controllers/orderController.js";
import { protect } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Every order route needs the user to be logged in.
router.use(protect);

// The list of allowed return reasons.
router.get("/return-reasons", getReturnReasons);

// Place a new order and view your own orders.
router.post("/", createOrder);
router.get("/my", getMyOrders);

// View, cancel, or request a return for one order.
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

// "upload" lets the customer attach up to 3 return images.
router.post("/:id/return", upload.array("images", 3), requestReturn);
router.get("/:id/return-image/:imageId", getReturnImage);

export default router;
