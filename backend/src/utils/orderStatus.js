import Product from "../models/Product.js";

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

export const REFUND_STATUSES = ["none", "pending", "initiated", "processing", "completed", "failed"];

export const RETURN_REASONS = [
  "Defective product",
  "Wrong item received",
  "Not as described",
  "Changed my mind",
  "Other",
];

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

export const CANCELLABLE_STATUSES = ["pending", "confirmed", "processing", "packed"];

export const canTransition = (from, to) => {
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

export const canCancel = (status) => CANCELLABLE_STATUSES.includes(status);

export const canReturn = (status) => status === "delivered";

export const adjustStock = async (order, direction, session = null) => {
  const shouldReduce = direction === "reduce";
  const shouldRestore = direction === "restore";

  if (shouldReduce && order.stockReduced) return;
  if (shouldRestore && !order.stockReduced) return;

  const multiplier = shouldReduce ? -1 : 1;
  const opts = session ? { session } : {};

  for (const item of order.items) {
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

  order.stockReduced = shouldReduce;
};

export const buildReturnImageUrls = (req, order) => {
  const images = order.returnInfo?.images || [];
  return images.map(
    (img) =>
      `${req.protocol}://${req.get("host")}/api/orders/${order._id}/return-image/${img._id}`
  );
};
