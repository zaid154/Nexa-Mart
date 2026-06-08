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

router.use(protect);

router.get("/return-reasons", getReturnReasons);
router.post("/", createOrder);
router.get("/my", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);
router.post("/:id/return", upload.array("images", 3), requestReturn);
router.get("/:id/return-image/:imageId", getReturnImage);

export default router;
