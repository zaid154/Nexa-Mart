import Product from "../models/productModel.js";

export const ORDER_STATUSES = [
  "pending", "confirmed", "processing", "packed", "shipped",
  "out_for_delivery", "delivered", "cancelled", "return_requested",
  "return_approved", "return_rejected", "returned",
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

export const canTransition = (from, to) => (ALLOWED_TRANSITIONS[from] || []).includes(to);
export const canCancel = (status) => CANCELLABLE_STATUSES.includes(status);
export const canReturn = (status) => status === "delivered";

// Adjust product and variant stock: direction is "reduce" or "restore"
export const adjustStock = async (order, direction, session = null) => {
  const isReduce = direction === "reduce";
  if (isReduce ? order.stockReduced : !order.stockReduced) return;

  const multiplier = isReduce ? -1 : 1;
  const opts = session ? { session } : {};

  for (const item of order.items) {
    const product = await Product.findById(item.product).session(session || null);
    const variant = item.variant && product ? product.variants.id(item.variant) : null;

    if (isReduce) {
      const stock = variant ? variant.countInStock : product?.countInStock;
      if (!product || stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
    }

    if (variant) {
      variant.countInStock += multiplier * item.quantity;
      product.countInStock += multiplier * item.quantity;
      await product.save(opts);
    } else {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { countInStock: multiplier * item.quantity } },
        opts
      );
    }
  }

  order.stockReduced = isReduce;
};

export const buildReturnImageUrls = (req, order) => {
  const images = order.returnInfo?.images || [];
  return images.map(
    (img) => `${req.protocol}://${req.get("host")}/api/orders/${order._id}/return-image/${img._id}`
  );
};
