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

const orderToView = (req, order) => {
  const obj = order.toObject ? order.toObject() : order;
  const returnImages = buildReturnImageUrls(req, order);
  return {
    ...obj,
    returnInfo: obj.returnInfo
      ? { ...obj.returnInfo, imageUrls: returnImages }
      : obj.returnInfo,
  };
};

const ADMIN_FORWARD_STATUSES = [
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const getStats = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    userCount,
    productCount,
    orderCount,
    revenueAgg,
    lowStock,
    recentOrders,
    pendingReturns,
    refundsDue,
    pendingOrders,
    salesChart,
    ordersByStatus,
    recentActivity,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Product.countDocuments({ isDeleted: { $ne: true } }),
    Order.countDocuments(),
    Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]),
    Product.countDocuments({ countInStock: { $lte: 5 }, isDeleted: { $ne: true } }),
    Order.find().sort({ createdAt: -1 }).limit(5).populate("user", "name email"),
    Order.countDocuments({ status: "return_requested" }),
    Order.countDocuments({ "refund.status": { $in: ["pending", "initiated", "processing"] } }),
    Order.countDocuments({ status: { $in: ["pending", "confirmed", "processing"] } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isPaid: true } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("actor", "name email"),
  ]);

  res.json({
    users: userCount,
    products: productCount,
    orders: orderCount,
    revenue: revenueAgg[0]?.total || 0,
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

export const getLogs = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const { page, limit, skip } = getPagination(req.query, 100);
  const filter = {};
  if (type) filter.type = type;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate("actor", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ActivityLog.countDocuments(filter),
  ]);

  res.json(paginatedResponse(logs, total, page, limit));
});

export const exportOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(5000);

  const header = "OrderID,Customer,Email,Total,Status,Paid,Date\n";
  const rows = orders
    .map((o) =>
      [
        o._id,
        `"${o.user?.name || ""}"`,
        o.user?.email || "",
        o.totalPrice,
        o.status,
        o.isPaid,
        o.createdAt.toISOString(),
      ].join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send(header + rows);
});

export const exportProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 });

  const header = "SKU,Name,Brand,Category,Price,Stock,Status\n";
  const rows = products
    .map((p) =>
      [p.sku, `"${p.name}"`, p.brand, p.category, p.price, p.countInStock, p.status].join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=products.csv");
  res.send(header + rows);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { status, paymentStatus, search, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) filter.status = status;

  if (paymentStatus === "paid") filter.isPaid = true;
  if (paymentStatus === "unpaid") filter.isPaid = false;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(100, Number(limit));

  let orders;
  let total;

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
    if (/^[a-f0-9]{6,24}$/i.test(term)) {
      orFilters.push({ _id: { $regex: term, $options: "i" } });
    }

    filter.$or = orFilters;
  }

  [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage),
    Order.countDocuments(filter),
  ]);

  res.json({
    orders: orders.map((o) => orderToView(req, o)),
    page: pageNum,
    pages: Math.ceil(total / perPage),
    total,
  });
});

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

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;

  if (!ORDER_STATUSES.includes(status)) {
    res.status(400);
    throw new Error("Invalid order status");
  }
  if (!ADMIN_FORWARD_STATUSES.includes(status) && status !== "returned") {
    res.status(400);
    throw new Error("Status cannot be set directly");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (!canTransition(order.status, status)) {
    res.status(400);
    throw new Error(`Cannot change status from ${order.status} to ${status}`);
  }

  order.status = status;
  order.trackingHistory.push({ status, note: note || `Status updated to ${status}` });

  if (status === "delivered") {
    order.deliveredAt = new Date();
    if (order.paymentMethod === "cod" && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
    }
  }

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

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { isPaid } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  order.isPaid = Boolean(isPaid);
  order.paidAt = isPaid ? new Date() : undefined;
  order.trackingHistory.push({
    status: order.status,
    note: isPaid ? "Payment marked as received" : "Payment marked as unpaid",
  });

  await order.save();
  res.json({ order: orderToView(req, order) });
});

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

export const updateRefund = asyncHandler(async (req, res) => {
  const { status, amount, reason, transactionId, notes } = req.body;

  if (status && !REFUND_STATUSES.includes(status)) {
    res.status(400);
    throw new Error("Invalid refund status");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  if (amount !== undefined && (amount < 0 || amount > order.totalPrice)) {
    res.status(400);
    throw new Error("Refund amount must be between 0 and order total");
  }

  const refund = { ...(order.refund?.toObject?.() || order.refund || {}) };

  if (status) refund.status = status;
  if (amount !== undefined) refund.amount = amount;
  if (reason !== undefined) refund.reason = reason;
  if (transactionId !== undefined) refund.transactionId = transactionId;
  if (notes !== undefined) refund.notes = notes;

  if (status === "initiated" && !refund.initiatedAt) refund.initiatedAt = new Date();
  if (status === "completed") refund.completedAt = new Date();

  order.refund = refund;
  order.trackingHistory.push({
    status: order.status,
    note: `Refund updated: ${status || refund.status}`,
  });

  await order.save();
  res.json({ order: orderToView(req, order) });
});

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

export const bulkUpdateOrders = asyncHandler(async (req, res) => {
  const { ids, action } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error("Order IDs are required");
  }

  const targetStatus = action?.status;
  if (!targetStatus || !ADMIN_FORWARD_STATUSES.includes(targetStatus)) {
    res.status(400);
    throw new Error("Valid bulk action status is required");
  }

  let updated = 0;
  let skipped = 0;

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

export const getReturnRequests = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    status: { $in: ["return_requested", "return_approved", "return_rejected", "returned"] },
  })
    .populate("user", "name email")
    .sort({ "returnInfo.requestedAt": -1 });

  res.json({ orders: orders.map((o) => orderToView(req, o)) });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isDeleted: { $ne: true } })
    .select("-cart -wishlist -refreshTokens")
    .sort({ createdAt: -1 });
  res.json({ users });
});

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
  if (user._id.toString() === req.user._id.toString() && role !== "admin") {
    res.status(400);
    throw new Error("You cannot demote yourself");
  }
  user.role = role;
  await user.save();
  res.json({ message: "Role updated", user: { _id: user._id, role: user.role } });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    res.status(400);
    throw new Error("You cannot delete yourself");
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
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
