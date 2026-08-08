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

// Short "9 Jun" label, for chart axes where the full date does not fit.
export const formatShortDate = (date) => {
  if (!date) {
    return "";
  }
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return String(date);
  }
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// Compact rupee amount for chart axes, using Indian units (₹6.2L, ₹1.4Cr).
// Full amounts are far too wide for a Y axis tick.
export const formatCompactINR = (amount) => {
  const value = amount || 0;
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `₹${Math.round(value / 1000)}k`;
  }
  return `₹${value}`;
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

// Turn a snake_case value from the API ("order_created", "admin_action") into
// readable text ("Order created", "Admin action"). Used for log types and
// actions, which are open-ended lists the backend adds to over time, so a
// fixed lookup table would silently fall back to raw values.
export const humanizeKey = (value) => {
  if (!value) {
    return "—";
  }
  const spaced = String(value).replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

// Product status labels shown in the admin catalog
const PRODUCT_STATUS_LABELS = {
  active: "Active",
  draft: "Draft",
  out_of_stock: "Out of stock",
};

// Get readable product status text
export const productStatusLabel = (status) => {
  if (PRODUCT_STATUS_LABELS[status]) {
    return PRODUCT_STATUS_LABELS[status];
  }
  return humanizeKey(status);
};

// CSS class for an activity log type, so failures stand out from routine entries
export const logTypeBadgeClass = (type) => {
  if (["error", "security"].includes(type)) {
    return "badge-danger";
  }
  if (type === "admin_action") {
    return "badge-warning";
  }
  if (type === "order") {
    return "badge-success";
  }
  return "badge-info";
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

// One tone per status, and everything that shows a status derives its colour
// from here — the badge, the dot on the orders list, the timeline node. The old
// version gave confirmed, processing, packed, shipped and out_for_delivery the
// same blue, so a shopper could not tell "being packed" from "at your door".
// "transit" is the tone that split those apart; it uses the copper ramp, which
// no status treatment was using.
const STATUS_TONES = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  packed: "info",
  shipped: "transit",
  out_for_delivery: "transit",
  delivered: "success",
  cancelled: "danger",
  return_requested: "warning",
  return_approved: "info",
  return_rejected: "danger",
  returned: "success",
};

// The tone name for a status: warning | info | transit | success | danger.
export const statusTone = (status) => {
  if (STATUS_TONES[status]) {
    return STATUS_TONES[status];
  }
  return "info";
};

const TONE_BADGE = {
  warning: "badge-warning",
  info: "badge-info",
  transit: "badge-transit",
  success: "badge-success",
  danger: "badge-danger",
};

const TONE_DOT = {
  warning: "bg-warning",
  info: "bg-accent-500",
  transit: "bg-copper-500",
  success: "bg-success",
  danger: "bg-danger",
};

// CSS class for order status badge color
export const statusBadgeClass = (status) => {
  return TONE_BADGE[statusTone(status)];
};

// Solid colour for the small status dot on the orders list and the tracking
// history. Lives here so it can never drift from the badge again — it used to
// be a second copy of the branching inside pages/Orders.jsx.
export const statusDotClass = (status) => {
  return TONE_DOT[statusTone(status)];
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

// Statuses admin can move order forward to
export const ADMIN_FORWARD_STATUSES = [
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];
