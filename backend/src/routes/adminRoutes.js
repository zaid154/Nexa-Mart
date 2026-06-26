// These are the routes for everything under /api/admin.

import express from "express";
import {
  getStats,
  getLogs,
  exportOrders,
  exportProducts,
  getAllOrders,
  getOrderByIdAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  approveReturn,
  rejectReturn,
  updateRefund,
  processRazorpayRefund,
  addOrderNote,
  bulkUpdateOrders,
  getReturnRequests,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
} from "../controllers/adminController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

// Every admin route needs a logged-in admin.
router.use(protect, admin);

// Dashboard, logs and CSV exports.
router.get("/stats", getStats);
router.get("/logs", getLogs);
router.get("/export/orders", exportOrders);
router.get("/export/products", exportProducts);

// Order management.
router.get("/orders", getAllOrders);
router.post("/orders/bulk", bulkUpdateOrders);
router.get("/orders/:id", getOrderByIdAdmin);
router.put("/orders/:id/status", updateOrderStatus);
router.put("/orders/:id/payment", updatePaymentStatus);
router.put("/orders/:id/return/approve", approveReturn);
router.put("/orders/:id/return/reject", rejectReturn);
router.put("/orders/:id/refund", updateRefund);
router.post("/orders/:id/refund/razorpay", processRazorpayRefund);
router.post("/orders/:id/notes", addOrderNote);

// Returns list.
router.get("/returns", getReturnRequests);

// User management.
router.get("/users", getAllUsers);
router.put("/users/:id/role", updateUserRole);
router.put("/users/:id/status", updateUserStatus);
router.delete("/users/:id", deleteUser);

export default router;
