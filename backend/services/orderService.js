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

// Validate shipping address has required fields
export const validateShippingAddress = (address) => {
  if (!address) throw new Error("Shipping address is required");
  const required = ["fullName", "phone", "line1", "city", "state", "postalCode"];
  for (const field of required) {
    if (!address[field] || !String(address[field]).trim()) {
      throw new Error(`Address field "${field}" is required`);
    }
  }
};

// Calculate order item subtotal, tax, and total
export const calculateOrderTotals = ({ itemsPrice, shippingPrice = 0, taxRate = 0, discount = 0 }) => {
  const tax = Math.round(itemsPrice * taxRate * 100) / 100;
  const net = Math.max(0, itemsPrice - discount);
  const total = Math.max(0, net + shippingPrice + tax);
  return {
    itemsPrice: Math.round(itemsPrice * 100) / 100,
    shippingPrice: Math.round(shippingPrice * 100) / 100,
    taxPrice: tax,
    discountPrice: Math.round(discount * 100) / 100,
    totalPrice: Math.round(total * 100) / 100,
  };
};

// Adjust product stock: direction is "reduce" or "restore"
export const adjustStock = async (order, direction, session = null) => {
  const isReduce = direction === "reduce";
  if (isReduce ? order.stockReduced : !order.stockReduced) return;

  const multiplier = isReduce ? -1 : 1;
  const opts = session ? { session } : {};

  for (const item of order.items) {
    const product = await Product.findById(item.product).session(session || null);

    if (isReduce) {
      const stock = product ? product.countInStock : 0;
      if (!product || stock < item.quantity) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }
    }

    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { countInStock: multiplier * item.quantity } },
      opts
    );
  }

  order.stockReduced = isReduce;
};

export const buildReturnImageUrls = (req, order) => {
  const images = order.returnInfo?.images || [];
  return images.map(
    (img) => `${req.protocol}://${req.get("host")}/api/orders/${order._id}/return-image/${img._id}`
  );
};
