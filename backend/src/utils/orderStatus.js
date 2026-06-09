// Helpers and constants for order status, returns, refunds and stock.

import Product from "../models/Product.js";

// All the statuses an order can have, in order of the normal flow.
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "return_approved",
  "return_rejected",
  "returned",
];

// All the possible refund statuses.
export const REFUND_STATUSES = ["none", "pending", "initiated", "processing", "completed", "failed"];

// The reasons a customer can choose when requesting a return.
export const RETURN_REASONS = [
  "Defective product",
  "Wrong item received",
  "Not as described",
  "Changed my mind",
  "Other",
];

// Which statuses an order is allowed to move to from its current status.
export const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["return_approved", "return_rejected"],
  return_approved: ["returned"],
  cancelled: [],
  return_rejected: [],
  returned: [],
};

// Statuses where a customer is still allowed to cancel the order.
export const CANCELLABLE_STATUSES = ["pending", "confirmed", "processing", "packed"];

// Check if moving from one status to another is allowed.
export const canTransition = (from, to) => {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

// Can this order still be cancelled?
export const canCancel = (status) => {
  return CANCELLABLE_STATUSES.includes(status);
};

// A return can only be requested for delivered orders.
export const canReturn = (status) => {
  return status === "delivered";
};

// Reduce or restore product stock for all items in an order.
// direction is either "reduce" (when placing/paying) or "restore" (cancel/return).
export const adjustStock = async (order, direction, session = null) => {
  const shouldReduce = direction === "reduce";
  const shouldRestore = direction === "restore";

  // Do not reduce twice, and do not restore if stock was never reduced.
  if (shouldReduce && order.stockReduced) {
    return;
  }
  if (shouldRestore && !order.stockReduced) {
    return;
  }

  // Reducing subtracts stock (-1); restoring adds it back (+1).
  let multiplier = 1;
  if (shouldReduce) {
    multiplier = -1;
  }

  // Pass the database session through if one was given (for transactions).
  let opts = {};
  if (session) {
    opts = { session };
  }

  // Go through each item and update its product's stock.
  for (const item of order.items) {
    // When reducing, first make sure there is enough stock.
    if (shouldReduce) {
      const product = await Product.findById(item.product).session(session || null);
      if (!product || product.countInStock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
    }

    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { countInStock: multiplier * item.quantity } },
      opts
    );
  }

  // Remember the new state so we do not double-apply later.
  order.stockReduced = shouldReduce;
};

// Build full URLs for the return images so the frontend can display them.
export const buildReturnImageUrls = (req, order) => {
  const images = order.returnInfo?.images || [];
  return images.map((img) => {
    return `${req.protocol}://${req.get("host")}/api/orders/${order._id}/return-image/${img._id}`;
  });
};
