import api from "../api/apiClient.js";

// Dynamically load Razorpay SDK only when checkout is triggered
let razorpayLoading = null;

export const loadRazorpay = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!razorpayLoading) {
    razorpayLoading = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        razorpayLoading = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  return razorpayLoading;
};

// Opens the Razorpay checkout for `order` and resolves once it is on screen.
export const payForOrder = async ({ order, user, address, onSuccess, onFailure, onDismiss }) => {
  const { data } = await api.post(`/payment/razorpay/${order._id}`);

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
