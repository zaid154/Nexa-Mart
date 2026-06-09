// This controller powers the admin panel:
// dashboard stats, logs, CSV exports, order management,
// returns/refunds, and user management.

import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import {
  adjustStock,
  buildReturnImageUrls,
  canTransition,
  ORDER_STATUSES,
  REFUND_STATUSES,
} from "../utils/orderStatus.js";
import { logActivity } from "../utils/logger.js";
import { getPagination, paginatedResponse } from "../utils/paginate.js";

// Convert an order into the shape the frontend expects,
// adding full URLs for any return images.
const orderToView = (req, order) => {
  let obj;
  if (order.toObject) {
    obj = order.toObject();
  } else {
    obj = order;
  }

  const returnImages = buildReturnImageUrls(req, order);

  let returnInfo = obj.returnInfo;
  if (returnInfo) {
    returnInfo = { ...returnInfo, imageUrls: returnImages };
  }

  return {
    ...obj,
    returnInfo,
  };
};

// The statuses an admin is allowed to move an order forward through.
const ADMIN_FORWARD_STATUSES = [
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

// GET /api/admin/stats  - all the numbers for the dashboard.
export const getStats = asyncHandler(async (req, res) => {
  // A date 30 days ago, used for the recent sales chart.
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count the main totals.
  const userCount = await User.countDocuments({ isDeleted: { $ne: true } });
  const productCount = await Product.countDocuments({ isDeleted: { $ne: true } });
  const orderCount = await Order.countDocuments();

  // Total revenue from all paid orders.
  const revenueAgg = await Order.aggregate([
    { $match: { isPaid: true } },
    { $group: { _id: null, total: { $sum: "$totalPrice" } } },
  ]);

  // Counts that need attention from the admin.
  const lowStock = await Product.countDocuments({ countInStock: { $lte: 5 }, isDeleted: { $ne: true } });
  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email");
  const pendingReturns = await Order.countDocuments({ status: "return_requested" });
  const refundsDue = await Order.countDocuments({
    "refund.status": { $in: ["pending", "initiated", "processing"] },
  });
  const pendingOrders = await Order.countDocuments({
    status: { $in: ["pending", "confirmed", "processing"] },
  });

  // Sales grouped by day for the last 30 days.
  const salesChart = await Order.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo }, isPaid: true } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // How many orders are in each status.
  const ordersByStatus = await Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

  // The latest activity log entries.
  const recentActivity = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("actor", "name email");

  // Pull the revenue total safely (it may be empty).
  let revenue = 0;
  if (revenueAgg[0]) {
    revenue = revenueAgg[0].total;
  }

  res.json({
    users: userCount,
    products: productCount,
    orders: orderCount,
    revenue,
    lowStock,
    pendingReturns,
    refundsDue,
    pendingOrders,
    recentOrders,
    salesChart,
    ordersByStatus,
    recentActivity,
  });
});

// GET /api/admin/logs  - paged list of activity logs.
export const getLogs = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const { page, limit, skip } = getPagination(req.query, 100);

  const filter = {};
  if (type) {
    filter.type = type;
  }

  const logs = await ActivityLog.find(filter)
    .populate("actor", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await ActivityLog.countDocuments(filter);

  res.json(paginatedResponse(logs, total, page, limit));
});

// GET /api/admin/export/orders  - download all orders as a CSV file.
export const exportOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(5000);

  const header = "OrderID,Customer,Email,Total,Status,Paid,Date\n";

  // Build one CSV row per order.
  const rows = orders
    .map((o) => {
      let customerName = "";
      let customerEmail = "";
      if (o.user) {
        customerName = o.user.name || "";
        customerEmail = o.user.email || "";
      }

      return [
        o._id,
        `"${customerName}"`,
        customerEmail,
        o.totalPrice,
        o.status,
        o.isPaid,
        o.createdAt.toISOString(),
      ].join(",");
    })
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send(header + rows);
});

// GET /api/admin/export/products  - download all products as a CSV file.
export const exportProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });

  const header = "SKU,Name,Brand,Category,Price,Stock,Status\n";

  const rows = products
    .map((p) => {
      return [p.sku, `"${p.name}"`, p.brand, p.category, p.price, p.countInStock, p.status].join(",");
    })
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=products.csv");
  res.send(header + rows);
});

// GET /api/admin/orders  - search/filter/page through all orders.
export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, paymentStatus, search, from, to, page = 1, limit = 20 } = req.query;

  const filter = {};

  if (status) {
    filter.status = status;
  }

  // Filter by paid / unpaid.
  if (paymentStatus === "paid") {
    filter.isPaid = true;
  }
  if (paymentStatus === "unpaid") {
    filter.isPaid = false;
  }

  // Filter by a date range.
  if (from || to) {
    filter.createdAt = {};
    if (from) {
      filter.createdAt.$gte = new Date(from);
    }
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(100, Number(limit));

  // If there is a search term, look up matching users (and maybe an order id).
  if (search) {
    const term = search.trim();

    const users = await User.find({
      $or: [
        { name: { $regex: term, $options: "i" } },
        { email: { $regex: term, $options: "i" } },
      ],
    }).select("_id");
    const userIds = users.map((u) => u._id);

    const orFilters = [{ user: { $in: userIds } }];

    // If the search looks like an order id, search by id too.
    if (/^[a-f0-9]{6,24}$/i.test(term)) {
      orFilters.push({ _id: { $regex: term, $options: "i" } });
    }

    filter.$or = orFilters;
  }

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);

  const total = await Order.countDocuments(filter);

  res.json({
    orders: orders.map((o) => orderToView(req, o)),
    page: pageNum,
    pages: Math.ceil(total / perPage),
    total,
  });
});

// GET /api/admin/orders/:id  - view a single order with admin details.
export const getOrderByIdAdmin = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("user", "name email")
    .populate("adminNotes.author", "name");
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  res.json({ order: orderToView(req, order) });
});

// PUT /api/admin/orders/:id/status  - move an order to a new status.
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  // The status must be a real status value.
  if (!ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error("Invalid order status");
  }

  // Admins can only set forward statuses (or "returned"); others happen automatically.
  if (!ADMIN_FORWARD_STATUSES.includes(status) && status !== "returned") {
    res.status(400);
    throw new Error("Status cannot be set directly");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // Make sure the change follows the allowed flow.
  if (!canTransition(order.status, status)) {
    res.status(400);
    throw new Error(`Cannot change status from ${order.status} to ${status}`);
  }

  order.status = status;
  order.trackingHistory.push({ status, note: note || `Status updated to ${status}` });

  // When delivered, record the date. COD orders also become paid on delivery.
  if (status === "delivered") {
    order.deliveredAt = new Date();
    if (order.paymentMethod === "cod" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
  }

  // When returned, restore the stock and start a refund if it was paid.
  if (status === "returned") {
    await adjustStock(order, "restore");
    if (order.isPaid && order.refund.status === "none") {
      order.refund = {
        ...order.refund,
        status: "pending",
        amount: order.totalPrice,
        reason: "Product returned",
      };
    }
  }

  await order.save();
  res.json({ order: orderToView(req, order) });
});

// PUT /api/admin/orders/:id/payment  - manually mark an order paid/unpaid.
export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { isPaid } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isPaid = Boolean(isPaid);

  // Set or clear the paid date depending on the new value.
  if (isPaid) {
    order.paidAt = new Date();
  } else {
    order.paidAt = undefined;
  }

  let note;
  if (isPaid) {
    note = "Payment marked as received";
  } else {
    note = "Payment marked as unpaid";
  }
  order.trackingHistory.push({ status: order.status, note });

  await order.save();
  res.json({ order: orderToView(req, order) });
});

// PUT /api/admin/orders/:id/return/approve  - approve a return request.
export const approveReturn = asyncHandler(async (req, res) => {
  const { adminNote } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.status !== "return_requested") {
    res.status(400);
    throw new Error("No pending return request");
  }

  order.status = "return_approved";
  order.returnInfo.processedAt = new Date();
  order.returnInfo.adminNote = adminNote || "";
  order.trackingHistory.push({ status: "return_approved", note: adminNote || "Return approved" });

  await order.save();
  res.json({ order: orderToView(req, order) });
});

// PUT /api/admin/orders/:id/return/reject  - reject a return request.
export const rejectReturn = asyncHandler(async (req, res) => {
  const { adminNote } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (order.status !== "return_requested") {
    res.status(400);
    throw new Error("No pending return request");
  }

  order.status = "return_rejected";
  order.returnInfo.processedAt = new Date();
  order.returnInfo.adminNote = adminNote || "";
  order.trackingHistory.push({ status: "return_rejected", note: adminNote || "Return rejected" });

  await order.save();
  res.json({ order: orderToView(req, order) });
});

// PUT /api/admin/orders/:id/refund  - update the refund details on an order.
export const updateRefund = asyncHandler(async (req, res) => {
  const { status, amount, reason, transactionId, notes } = req.body;

  // If a status was given, it must be a valid refund status.
  if (status && !REFUND_STATUSES.includes(status)) {
    res.status(400);
    throw new Error("Invalid refund status");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  // The refund amount must be within range.
  if (amount !== undefined && (amount < 0 || amount > order.totalPrice)) {
    res.status(400);
    throw new Error("Refund amount must be between 0 and order total");
  }

  // Start from the current refund data (as a plain object).
  let refund;
  if (order.refund?.toObject) {
    refund = { ...order.refund.toObject() };
  } else if (order.refund) {
    refund = { ...order.refund };
  } else {
    refund = {};
  }

  // Apply only the fields that were sent.
  if (status) {
    refund.status = status;
  }
  if (amount !== undefined) {
    refund.amount = amount;
  }
  if (reason !== undefined) {
    refund.reason = reason;
  }
  if (transactionId !== undefined) {
    refund.transactionId = transactionId;
  }
  if (notes !== undefined) {
    refund.notes = notes;
  }

  // Record timestamps for certain statuses.
  if (status === "initiated" && !refund.initiatedAt) {
    refund.initiatedAt = new Date();
  }
  if (status === "completed") {
    refund.completedAt = new Date();
  }

  order.refund = refund;

  // Add a tracking note describing the refund change.
  let refundStatusText = status;
  if (!refundStatusText) {
    refundStatusText = refund.status;
  }
  order.trackingHistory.push({
    status: order.status,
    note: `Refund updated: ${refundStatusText}`,
  });

  await order.save();
  res.json({ order: orderToView(req, order) });
});

// POST /api/admin/orders/:id/notes  - add a private admin note to an order.
export const addOrderNote = asyncHandler(async (req, res) => {
  const { note } = req.body;

  if (!note?.trim()) {
    res.status(400);
    throw new Error("Note is required");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.adminNotes.push({ note: note.trim(), author: req.user._id });
  await order.save();

  await order.populate("adminNotes.author", "name");
  res.json({ order: orderToView(req, order) });
});

// POST /api/admin/orders/bulk  - move many orders to a new status at once.
export const bulkUpdateOrders = asyncHandler(async (req, res) => {
  const { ids, action } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error("Order IDs are required");
  }

  // The target status must be a valid forward status.
  const targetStatus = action?.status;
  if (!targetStatus || !ADMIN_FORWARD_STATUSES.includes(targetStatus)) {
    res.status(400);
    throw new Error("Valid bulk action status is required");
  }

  let updated = 0;
  let skipped = 0;

  // Go through each order id and update it if the change is allowed.
  for (const id of ids) {
    const order = await Order.findById(id);
    if (!order || !canTransition(order.status, targetStatus)) {
      skipped++;
      continue;
    }

    order.status = targetStatus;
    order.trackingHistory.push({
      status: targetStatus,
      note: `Bulk update to ${targetStatus}`,
    });

    // Same delivered handling as the single update.
    if (targetStatus === "delivered") {
      order.deliveredAt = new Date();
      if (order.paymentMethod === "cod" && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = new Date();
      }
    }

    await order.save();
    updated++;
  }

  res.json({ updated, skipped, total: ids.length });
});

// GET /api/admin/returns  - list all return-related orders.
export const getReturnRequests = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    status: { $in: ["return_requested", "return_approved", "return_rejected", "returned"] },
  })
    .populate("user", "name email")
    .sort({ "returnInfo.requestedAt": -1 });

  res.json({ orders: orders.map((o) => orderToView(req, o)) });
});

// GET /api/admin/users  - list all users.
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isDeleted: { $ne: true } })
    .select("-cart -wishlist -refreshTokens")
    .sort({ createdAt: -1 });
  res.json({ users });
});

// PUT /api/admin/users/:id/status  - activate or suspend a user.
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["active", "suspended"].includes(status)) {
    res.status(400);
    throw new Error("Invalid status");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // An admin cannot suspend their own account.
  if (user._id.toString() === req.user._id.toString() && status === "suspended") {
    res.status(400);
    throw new Error("You cannot suspend yourself");
  }

  user.status = status;
  await user.save();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "user_status_updated",
    meta: { userId: user._id, status },
    ip: req.ip,
  });

  res.json({ message: "Status updated", user: { _id: user._id, status: user.status } });
});

// PUT /api/admin/users/:id/role  - change a user's role.
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!["user", "admin"].includes(role)) {
    res.status(400);
    throw new Error("Invalid role");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // An admin cannot demote their own account.
  if (user._id.toString() === req.user._id.toString() && role !== "admin") {
    res.status(400);
    throw new Error("You cannot demote yourself");
  }

  user.role = role;
  await user.save();
  res.json({ message: "Role updated", user: { _id: user._id, role: user.role } });
});

// DELETE /api/admin/users/:id  - soft-delete a user.
export const deleteUser = asyncHandler(async (req, res) => {
  // An admin cannot delete their own account.
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot delete yourself");
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Mark as deleted and suspended, and clear their sessions.
  user.isDeleted = true;
  user.deletedAt = new Date();
  user.status = "suspended";
  user.refreshTokens = [];
  await user.save();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "user_deleted",
    meta: { userId: user._id },
    ip: req.ip,
  });

  res.json({ message: "User removed" });
});
