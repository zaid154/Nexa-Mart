// Load the Razorpay checkout SDK the first time it is actually needed.
//
// It used to sit in index.html, so every visitor paid for a third-party script
// on the home page and every product page even though only the checkout flow
// ever calls it.

let loading = null;

export const loadRazorpay = () => {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!loading) {
    loading = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        // Let a later attempt retry rather than caching the failure forever.
        loading = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  return loading;
};
