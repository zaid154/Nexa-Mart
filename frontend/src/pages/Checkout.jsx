import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatINR } from "../utils/format.js";
import { SkeletonCart } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";

// A blank shipping address used as the starting form values.
const emptyAddress = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
};

// Checkout page: collects the address, payment method, and places the order.
const Checkout = () => {
  const { cart, loading, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [address, setAddress] = useState({ ...emptyAddress, ...(user?.address || {}) });
  const [placing, setPlacing] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [errors, setErrors] = useState({});

  // A one-time key for this checkout session. If the order request is sent
  // twice (double-click, retry), the server returns the same order instead
  // of creating a duplicate.
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `key-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  });

  if (loading) {
    return <SkeletonCart />;
  }
  if (cart.items.length === 0) {
    return (
      <EmptyState
        eyebrow="Checkout"
        title="Cart is empty"
        message="Add items to your cart before checking out."
        icon="cart"
        action={<button type="button" className="btn" onClick={() => navigate("/products")}>Shop now</button>}
      />
    );
  }

  // Ask the server to validate the coupon and tell us the discount in rupees.
  // The server checks expiry, minimum order, and usage limits against the
  // real cart, so the discount cannot be faked from the browser.
  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code) {
      return;
    }
    setApplyingCoupon(true);
    try {
      const { data } = await api.post("/coupons/validate", { code });
      setDiscountAmount(data.discount);
      setAppliedCode(data.code);
      toast.success(data.message || `Coupon ${data.code} applied`);
    } catch (err) {
      setDiscountAmount(0);
      setAppliedCode("");
      toast.error(err.message);
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Work out all the price totals.
  const discountedSubtotal = cart.subtotal - discountAmount;

  let shipping = 99;
  if (discountedSubtotal >= 5000) {
    shipping = 0;
  }

  const tax = Math.round(discountedSubtotal * 0.18);
  const total = discountedSubtotal + shipping + tax;

  // Update one field of the address and clear its error.
  const setAddr = (key, value) => {
    setAddress((a) => ({ ...a, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  // Make sure the required address fields are filled in.
  const validate = () => {
    const newErrors = {};
    if (!address.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!address.phone.trim()) {
      newErrors.phone = "Phone is required";
    }
    if (!address.line1.trim()) {
      newErrors.line1 = "Address is required";
    }
    if (!address.city.trim()) {
      newErrors.city = "City is required";
    }
    if (!address.postalCode.trim()) {
      newErrors.postalCode = "Postal code is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Open the Razorpay popup and verify the payment when it finishes.
  const payWithRazorpay = async (order) => {
    const { data } = await api.post(`/payment/razorpay/${order._id}`);

    if (!window.Razorpay) {
      toast.error("Razorpay SDK failed to load");
      return;
    }

    const rzp = new window.Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: "NexaMart",
      description: `Order ${order._id}`,
      order_id: data.razorpayOrderId,
      prefill: {
        name: address.fullName || user.name,
        email: user.email,
        contact: address.phone,
      },
      theme: { color: "#0071e3" },
      handler: async (response) => {
        try {
          await api.post("/payment/verify", {
            orderId: order._id,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          await refresh();
          toast.success("Payment successful");
          navigate(`/orders/${order._id}?placed=1`);
        } catch (err) {
          toast.error(err.message);
        }
      },
      modal: {
        ondismiss: () => toast.info("Payment cancelled"),
      },
    });
    rzp.open();
  };

  // Create the order, then either finish (COD) or start the payment.
  const placeOrder = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please complete the shipping address");
      return;
    }

    setPlacing(true);
    try {
      let couponCode = "";
      if (discountAmount > 0 && appliedCode) {
        couponCode = appliedCode;
      }

      const { data } = await api.post("/orders", {
        shippingAddress: address,
        couponCode: couponCode,
        paymentMethod,
        idempotencyKey,
      });

      if (paymentMethod === "cod") {
        await refresh();
        toast.success("Order placed successfully");
        navigate(`/orders/${data.order._id}?placed=1`);
      } else {
        await payWithRazorpay(data.order);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPlacing(false);
    }
  };

  // Decide the text shown on the place-order button.
  let submitLabel;
  if (placing) {
    submitLabel = "Processing...";
  } else if (paymentMethod === "cod") {
    submitLabel = `Place Order · ${formatINR(total)}`;
  } else {
    submitLabel = `Pay ${formatINR(total)}`;
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Secure checkout"
        title="Checkout"
        subtitle="Complete your order with secure payment."
      />

      <div className="checkout-steps" aria-label="Checkout progress">
        <div className="checkout-step active">
          <span className="checkout-step-num">1</span>
          Shipping
        </div>
        <div className="checkout-step-divider" />
        <div className="checkout-step active">
          <span className="checkout-step-num">2</span>
          Delivery
        </div>
        <div className="checkout-step-divider" />
        <div className="checkout-step active">
          <span className="checkout-step-num">3</span>
          Payment
        </div>
        <div className="checkout-step-divider" />
        <div className="checkout-step">
          <span className="checkout-step-num">4</span>
          Review
        </div>
      </div>

      <div className="checkout-layout">
        <form className="card form" onSubmit={placeOrder} noValidate>
          <div className="checkout-section">
            <h3 className="form-section-title">Shipping Address</h3>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                className="input"
                value={address.fullName}
                onChange={(e) => setAddr("fullName", e.target.value)}
                aria-invalid={!!errors.fullName}
              />
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                className="input"
                value={address.phone}
                onChange={(e) => setAddr("phone", e.target.value)}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>
            <div className="field">
              <label htmlFor="line1">Address line 1</label>
              <input
                id="line1"
                className="input"
                value={address.line1}
                onChange={(e) => setAddr("line1", e.target.value)}
                aria-invalid={!!errors.line1}
              />
              {errors.line1 && <span className="field-error">{errors.line1}</span>}
            </div>
            <div className="field">
              <label htmlFor="line2">Address line 2</label>
              <input id="line2" className="input" value={address.line2} onChange={(e) => setAddr("line2", e.target.value)} />
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  className="input"
                  value={address.city}
                  onChange={(e) => setAddr("city", e.target.value)}
                  aria-invalid={!!errors.city}
                />
                {errors.city && <span className="field-error">{errors.city}</span>}
              </div>
              <div className="field">
                <label htmlFor="state">State</label>
                <input id="state" className="input" value={address.state} onChange={(e) => setAddr("state", e.target.value)} />
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="postalCode">Postal code</label>
                <input
                  id="postalCode"
                  className="input"
                  value={address.postalCode}
                  onChange={(e) => setAddr("postalCode", e.target.value)}
                  aria-invalid={!!errors.postalCode}
                />
                {errors.postalCode && <span className="field-error">{errors.postalCode}</span>}
              </div>
              <div className="field">
                <label htmlFor="country">Country</label>
                <input id="country" className="input" value={address.country} onChange={(e) => setAddr("country", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h3 className="form-section-title">Delivery Method</h3>
            <p className="muted font-sm">
              Standard delivery: {shipping === 0 ? "Free" : formatINR(shipping)} · 2-5 business days
            </p>
          </div>

          <div className="checkout-section">
            <h3 className="form-section-title">Payment Method</h3>
            <div className="payment-options">
              <label className={`payment-option ${paymentMethod === "razorpay" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="payment"
                  value="razorpay"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
                />
                <div>
                  <strong>Online Payment</strong>
                  <p className="muted">Pay securely via Razorpay (UPI, Card, Net Banking)</p>
                </div>
              </label>
              <label className={`payment-option ${paymentMethod === "cod" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                />
                <div>
                  <strong>Cash on Delivery</strong>
                  <p className="muted">Pay when your order arrives at your doorstep</p>
                </div>
              </label>
            </div>
          </div>

          <div className="row mt-4">
            <button type="submit" className="btn flex-1" disabled={placing}>
              {submitLabel}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={placing}
              onClick={() => navigate("/cart")}
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="card cart-summary">
          <h3>Order Review</h3>
          <div className="checkout-items">
            {cart.items.map((item) => {
              const product = item.product;
              const quantity = item.quantity;
              return (
                <div className="summary-row" key={product._id}>
                  <span className="muted">
                    {product.name} × {quantity}
                  </span>
                  <span>{formatINR(product.price * quantity)}</span>
                </div>
              );
            })}
          </div>
          <div className="coupon-row">
            <input
              className="input"
              placeholder="Coupon code (e.g. NEXA15)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              aria-label="Coupon code"
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={applyCoupon}
              disabled={applyingCoupon}
            >
              {applyingCoupon ? "..." : "Apply"}
            </button>
          </div>

          <div className="summary-row">
            <span className="muted">Subtotal</span>
            <span>{formatINR(cart.subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="summary-row">
              <span className="muted">Discount{appliedCode ? ` (${appliedCode})` : ""}</span>
              <span className="text-success">−{formatINR(discountAmount)}</span>
            </div>
          )}
          <div className="summary-row">
            <span className="muted">Shipping</span>
            <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
          </div>
          <div className="summary-row">
            <span className="muted">Tax (18%)</span>
            <span>{formatINR(tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
