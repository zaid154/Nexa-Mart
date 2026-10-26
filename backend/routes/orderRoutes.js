import express from "express";
import {
  createOrder, getMyOrders, getOrderById, cancelOrder,
  requestReturn, getReturnImage, getReturnReasons
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { createOrderSchema } from "../validators/orderValidators.js";

const router = express.Router();

router.use(protect);
router.get("/return-reasons", getReturnReasons);
router.post("/", validate(createOrderSchema), createOrder);
router.get("/my", getMyOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);
router.post("/:id/return", upload.array("images", 3), requestReturn);
router.get("/:id/return-image/:imageId", getReturnImage);

export default router;
