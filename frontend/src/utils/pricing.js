// Cart and checkout pricing calculations matching backend order rules
import {
  lookupPincode,
  lookupPincodeSync,
  formatEstimatedDate,
  calculatePincodeDelivery,
  isValidIndianPincode,
} from "./pincode.js";

// Work out delivery, tax and total for a subtotal and an applied discount.
export const calculateTotals = ({ subtotal = 0, discount = 0, commerce = {} }) => {
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
export const calculateSavings = ({
  items = [],
  subtotal = 0,
  discount = 0,
  shipping = 0,
  commerce = {},
}) => {
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

// Delivery date estimate based on transit days or default commerce window
export const deliveryEstimate = (commerce = {}, pincode = null) => {
  const codeToCheck =
    pincode || (typeof window !== "undefined" ? localStorage.getItem("nexamart_pincode") : null);

  if (codeToCheck && isValidIndianPincode(codeToCheck)) {
    const info = lookupPincodeSync(codeToCheck);
    if (info?.valid) {
      return formatEstimatedDate(info.daysMax);
    }
  }

  const days = commerce?.deliveryDaysMax ?? commerce?.deliveryDaysMin ?? 3;
  return formatEstimatedDate(days);
};

// "3-5 business days", or "3 business days" when the window is a single value.
export const deliveryWindowLabel = (commerce = {}) => {
  const min = commerce?.deliveryDaysMin ?? 2;
  const max = commerce?.deliveryDaysMax ?? min;
  if (min === max) {
    return `${min} business days`;
  }
  return `${min}-${max} business days`;
};

export { lookupPincode, formatEstimatedDate, calculatePincodeDelivery, isValidIndianPincode };
