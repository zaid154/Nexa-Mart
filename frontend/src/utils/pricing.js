// Order maths, derived entirely from the admin's commerce settings.
//
// The server recalculates all of this when the order is placed — this module
// exists so the cart and the checkout show the shopper the same numbers the
// order will charge, without either page keeping its own copy of the rules.

// Work out delivery, tax and total for a subtotal and an applied discount.
export const calculateTotals = ({ subtotal = 0, discount = 0, commerce }) => {
  const discountedSubtotal = subtotal - discount;

  const fee = commerce.shippingFee ?? 0;
  const threshold = commerce.freeShippingThreshold ?? 0;
  const shipping = discountedSubtotal >= threshold ? 0 : fee;

  const tax = Math.round((discountedSubtotal * (commerce.taxRatePercent ?? 0)) / 100);
  const total = discountedSubtotal + shipping + tax;

  return { discountedSubtotal, shipping, tax, total, shippingFee: fee };
};

// Everything the shopper saves against list price: the MRP difference, the
// coupon, and the waived delivery fee.
export const calculateSavings = ({ items = [], subtotal = 0, discount = 0, shipping = 0, commerce }) => {
  const mrpTotal = items.reduce((sum, item) => {
    const product = item.product;
    if (!product) {
      return sum;
    }
    const unit = item.unitPrice ?? product.price;
    // Scale the product's MRP ratio onto the unit actually being bought, so a
    // pricier variant shows a consistent saving.
    const listUnit =
      product.mrp > product.price ? Math.round(unit * (product.mrp / product.price)) : unit;
    return sum + listUnit * item.quantity;
  }, 0);

  const deliverySaving = shipping === 0 ? commerce.shippingFee ?? 0 : 0;
  return Math.max(0, mrpTotal - subtotal + discount + deliverySaving);
};

// "Tue, 12 Aug" — the delivery estimate, using the configured window.
export const deliveryEstimate = (commerce) => {
  const days = commerce.deliveryDaysMax ?? commerce.deliveryDaysMin ?? 0;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
};

// "3-5 business days", or "3 business days" when the window is a single value.
export const deliveryWindowLabel = (commerce) => {
  const min = commerce.deliveryDaysMin ?? 0;
  const max = commerce.deliveryDaysMax ?? min;
  if (min === max) {
    return `${min} business days`;
  }
  return `${min}-${max} business days`;
};
