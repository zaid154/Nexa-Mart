import express from "express";
import {
  getStats, getLogs, exportOrders, exportProducts,
  getAllOrders, getOrderByIdAdmin, updateOrderStatus, updatePaymentStatus,
  approveReturn, rejectReturn, updateRefund, processRazorpayRefund,
  addOrderNote, bulkUpdateOrders, getReturnRequests,
  getAllUsers, updateUserRole, updateUserStatus, deleteUser
} from "../controllers/adminController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, admin);

// Dashboard stats & exports
router.get("/stats", getStats);
router.get("/logs", getLogs);
router.get("/export/orders", exportOrders);
router.get("/export/products", exportProducts);

// Order management & returns
router.get("/orders", getAllOrders);
router.get("/orders/:id", getOrderByIdAdmin);
router.post("/orders/bulk", bulkUpdateOrders);
router.put("/orders/:id/status", updateOrderStatus);
router.put("/orders/:id/payment", updatePaymentStatus);
router.put("/orders/:id/return/approve", approveReturn);
router.put("/orders/:id/return/reject", rejectReturn);
router.put("/orders/:id/refund", updateRefund);
router.post("/orders/:id/refund/razorpay", processRazorpayRefund);
router.post("/orders/:id/notes", addOrderNote);
router.get("/returns", getReturnRequests);

// User management
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

export default router;
