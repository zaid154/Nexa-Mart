export const formatINR = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatDateTime = (date) =>
  new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  return_approved: "Return approved",
  return_rejected: "Return rejected",
  returned: "Returned",
};

const REFUND_LABELS = {
  none: "No refund",
  pending: "Refund pending",
  initiated: "Refund initiated",
  processing: "Refund processing",
  completed: "Refund completed",
  failed: "Refund failed",
};

export const statusLabel = (s) => STATUS_LABELS[s] || s;

export const refundStatusLabel = (s) => REFUND_LABELS[s] || s;

export const statusBadgeClass = (s) => {
  if (["delivered", "return_approved", "returned"].includes(s)) return "badge-success";
  if (["cancelled", "return_rejected"].includes(s)) return "badge-danger";
  if (["pending", "return_requested"].includes(s)) return "badge-warning";
  if (["confirmed", "processing", "packed", "shipped", "out_for_delivery"].includes(s))
    return "badge-info";
  return "badge-info";
};

export const refundBadgeClass = (s) => {
  if (s === "completed") return "badge-success";
  if (s === "failed") return "badge-danger";
  if (["pending", "initiated", "processing"].includes(s)) return "badge-warning";
  return "badge-info";
};

export const paymentMethodLabel = (m) => (m === "cod" ? "Cash on Delivery" : "Online (Razorpay)");

const CANCELLABLE = ["pending", "confirmed", "processing", "packed"];

export const orderActions = (order) => ({
  canCancel: CANCELLABLE.includes(order.status),
  canReturn: order.status === "delivered",
  canPay: order.paymentMethod === "razorpay" && !order.isPaid && order.status === "pending",
});

export const ORDER_STEPS = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const ADMIN_FORWARD_STATUSES = [
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];
