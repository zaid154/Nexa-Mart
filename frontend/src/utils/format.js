// Format price in Indian Rupees (e.g. ₹1,299)
export const formatINR = (amount) => {
  const value = amount || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

// Format date like "9 Jun 2026"
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// Format date and time like "9 Jun 2026, 02:30 pm"
export const formatDateTime = (date) => {
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Order status labels shown to user
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

// Refund status labels
const REFUND_LABELS = {
  none: "No refund",
  pending: "Refund pending",
  initiated: "Refund initiated",
  processing: "Refund processing",
  completed: "Refund completed",
  failed: "Refund failed",
};

// Get readable order status text
export const statusLabel = (status) => {
  if (STATUS_LABELS[status]) {
    return STATUS_LABELS[status];
  }
  return status;
};

// Get readable refund status text
export const refundStatusLabel = (status) => {
  if (REFUND_LABELS[status]) {
    return REFUND_LABELS[status];
  }
  return status;
};

// CSS class for order status badge color
export const statusBadgeClass = (status) => {
  if (["delivered", "return_approved", "returned"].includes(status)) {
    return "badge-success";
  }

  if (["cancelled", "return_rejected"].includes(status)) {
    return "badge-danger";
  }

  if (["pending", "return_requested"].includes(status)) {
    return "badge-warning";
  }

  if (["confirmed", "processing", "packed", "shipped", "out_for_delivery"].includes(status)) {
    return "badge-info";
  }

  return "badge-info";
};

// CSS class for refund status badge color
export const refundBadgeClass = (status) => {
  if (status === "completed") {
    return "badge-success";
  }

  if (status === "failed") {
    return "badge-danger";
  }

  if (["pending", "initiated", "processing"].includes(status)) {
    return "badge-warning";
  }

  return "badge-info";
};

// Show payment method name
export const paymentMethodLabel = (method) => {
  if (method === "cod") {
    return "Cash on Delivery";
  }
  return "Online (Razorpay)";
};

// Statuses where user can cancel order
const CANCELLABLE = ["pending", "confirmed", "processing", "packed"];

// Check what actions user can do on an order
export const orderActions = (order) => {
  const canCancel = CANCELLABLE.includes(order.status);
  const canReturn = order.status === "delivered";

  let canPay = false;
  if (order.paymentMethod === "razorpay" && !order.isPaid && order.status === "pending") {
    canPay = true;
  }

  return {
    canCancel: canCancel,
    canReturn: canReturn,
    canPay: canPay,
  };
};

// Steps shown in order tracking timeline
export const ORDER_STEPS = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

// Statuses admin can move order forward to
export const ADMIN_FORWARD_STATUSES = [
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];
