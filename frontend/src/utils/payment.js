// Opening the Razorpay window for an order that already exists.
//
// This lived inside Checkout, which meant an order that was created but not
// paid for had no way back to a payment window — `orderActions().canPay` was
// computed and then rendered nowhere, so a pending order was a dead end. Now
// the order page can call the same flow.

import api from "../api/client.js";
import { loadRazorpay } from "./razorpay.js";

// Opens the Razorpay checkout for `order` and resolves once it is on screen.
// `onSuccess` runs after the server has verified the signature; `onFailure`
// covers a verification error, and `onDismiss` a shopper who closed the window.
export const payForOrder = async ({ order, user, address, onSuccess, onFailure, onDismiss }) => {
  const { data } = await api.post(`/payment/razorpay/${order._id}`);

  // Fetched here rather than in index.html, so it costs nothing on any page
  // that is not a payment.
  const ready = await loadRazorpay();
  if (!ready || !window.Razorpay) {
    throw new Error("Razorpay SDK failed to load");
  }

  const rzp = new window.Razorpay({
    key: data.keyId,
    amount: data.amount,
    currency: data.currency,
    name: "NexaMart",
    description: `Order ${order._id}`,
    order_id: data.razorpayOrderId,
    prefill: {
      name: address?.fullName || user?.name || "",
      email: user?.email || "",
      contact: address?.phone || order?.shippingAddress?.phone || "",
    },
    theme: { color: "#2874f0" },
    handler: async (response) => {
      try {
        await api.post("/payment/verify", {
          orderId: order._id,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        if (onSuccess) {
          await onSuccess(order);
        }
      } catch (err) {
        if (onFailure) {
          onFailure(err);
        }
      }
    },
    modal: {
      ondismiss: () => {
        if (onDismiss) {
          onDismiss();
        }
      },
    },
  });

  rzp.open();
};
