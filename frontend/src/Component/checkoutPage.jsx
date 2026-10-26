import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/apiClient.js";
import { useCart } from "../context/cartContext.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import { formatINR } from "../utils/formatUtils.js";
import { payForOrder } from "../utils/paymentUtils.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImageUtils.js";

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const savedAddr = user?.address || user?.addresses?.[0] || {};
  const [address, setAddress] = useState({
    fullName: savedAddr.fullName || user?.name || "",
    phone: savedAddr.phone || user?.phone || "",
    line1: savedAddr.line1 || "",
    line2: savedAddr.line2 || "",
    city: savedAddr.city || "",
    state: savedAddr.state || "",
    postalCode: savedAddr.postalCode || "",
    country: savedAddr.country || "India",
  });

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart?.subtotal || 0;
  const shippingFee = subtotal >= 5000 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shippingFee;

  const handleChange = (e) => {
    setAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    const targetAddress = {
      fullName: (address.fullName || address.name || user?.name || "").trim(),
      phone: (address.phone || "").trim(),
      line1: (address.line1 || "").trim(),
      line2: (address.line2 || "").trim(),
      city: (address.city || "").trim(),
      state: (address.state || "").trim(),
      postalCode: (address.postalCode || "").trim(),
      country: address.country || "India",
    };

    if (!targetAddress.fullName || targetAddress.fullName.length < 2) {
      toast.error("Please provide a valid full recipient name.");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(targetAddress.phone)) {
      toast.error("Mobile number must be 10 digits starting with 6, 7, 8 or 9.");
      return;
    }
    if (!targetAddress.line1 || targetAddress.line1.length < 5) {
      toast.error("Address must include house or street details (min 5 chars).");
      return;
    }
    if (!targetAddress.city || targetAddress.city.length < 2) {
      toast.error("Please enter a valid city name.");
      return;
    }
    if (!targetAddress.state || targetAddress.state.length < 2) {
      toast.error("Please enter your state.");
      return;
    }
    if (!/^[1-9]\d{5}$/.test(targetAddress.postalCode)) {
      toast.error("Pincode must be 6 digits and cannot start with 0.");
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      toast.error("Your cart is empty.");
      navigate("/products");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create order on backend
      const { data } = await api.post("/orders", {
        shippingAddress: targetAddress,
        paymentMethod,
        couponCode: cart?.couponCode || undefined,
      });

      const createdOrder = data.order || data;

      // 2. Handle payment flow
      if (paymentMethod === "cod") {
        await refresh();
        toast.success("Order placed successfully!");
        navigate(`/orders/${createdOrder._id}?placed=1`);
        return;
      }

      // 3. Online payment via Razorpay
      await payForOrder({
        order: createdOrder,
        user,
        address: targetAddress,
        onSuccess: async () => {
          await refresh();
          toast.success("Payment completed successfully!");
          navigate(`/orders/${createdOrder._id}?placed=1`);
        },
        onFailure: (err) => {
          toast.error(err.message || "Payment verification failed");
          navigate(`/orders/${createdOrder._id}`);
        },
        onDismiss: () => {
          toast.info("Payment window closed. Order saved in My Orders.");
          navigate(`/orders/${createdOrder._id}`);
        },
      });
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="w-full pb-8">
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-lg border border-slate-200 text-center shadow-xs">
          <h2 className="text-lg font-bold text-slate-800">Your Cart is Empty</h2>
          <p className="text-xs text-slate-500 mt-1">Please add items to your cart before proceeding to checkout.</p>
          <button
            type="button"
            onClick={() => navigate("/products")}
            className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700"
          >
            Explore Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3.5">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Delivery Address (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              1
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Delivery Address
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={address.fullName}
                onChange={handleChange}
                required
                placeholder="Recipient full name"
                className="w-full p-2 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Mobile Phone *</label>
              <input
                type="tel"
                name="phone"
                value={address.phone}
                onChange={handleChange}
                required
                placeholder="10-digit mobile number"
                className="w-full p-2 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Street Address *</label>
              <input
                type="text"
                name="line1"
                value={address.line1}
                onChange={handleChange}
                required
                placeholder="Flat/House No., Street Area"
                className="w-full p-2 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Landmark / Area (Optional)</label>
              <input
                type="text"
                name="line2"
                value={address.line2 || ""}
                onChange={handleChange}
                placeholder="Nearby landmark or area"
                className="w-full p-2 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">City / Town *</label>
              <input
                type="text"
                name="city"
                value={address.city}
                onChange={handleChange}
                required
                placeholder="City"
                className="w-full p-2 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">State *</label>
                <input
                  type="text"
                  name="state"
                  value={address.state}
                  onChange={handleChange}
                  required
                  placeholder="State"
                  className="w-full p-2 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">Pincode *</label>
                <input
                  type="text"
                  name="postalCode"
                  value={address.postalCode}
                  onChange={handleChange}
                  required
                  placeholder="6 digits"
                  className="w-full p-2 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Unified Compact Order Summary + Payment Mode + Proceed CTA (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Order Summary ({cart.items.length})
            </h2>
            <Link to="/cart" className="text-2xs text-blue-600 hover:underline font-semibold">
              Edit Cart
            </Link>
          </div>

          {/* Compact items list (scrolls if many items, keeping page height tight) */}
          <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 pr-1">
            {cart.items.map((item, idx) => {
              const p = item.product || {};
              const img = p.images?.[0] || p.image || PRODUCT_IMAGE_PLACEHOLDER;

              return (
                <div key={idx} className="py-2 flex items-center gap-2.5">
                  <img
                    src={img}
                    alt={p.name}
                    onError={onProductImageError}
                    className="w-9 h-9 rounded object-contain border p-0.5 bg-slate-50 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name || "Product"}</p>
                    <p className="text-3xs text-slate-400">
                      Qty: {item.quantity} × {formatINR(item.unitPrice || p.price)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    {formatINR((item.unitPrice || p.price) * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pricing calculations */}
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal</span>
              <span className="font-semibold">{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span className="font-semibold text-green-600">
                {shippingFee === 0 ? "FREE" : formatINR(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-100">
              <span>Total Payable</span>
              <span className="text-blue-600">{formatINR(total)}</span>
            </div>
          </div>

          {/* Payment Option Selector (Side-by-side compact 2-col pills) */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
              Select Payment Mode:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-2 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === "razorpay"
                    ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    className="accent-blue-600 shrink-0"
                  />
                  <span>Online Pay</span>
                </div>
                <span className="text-3xs text-slate-500 pl-4 mt-0.5">UPI / Cards / NetBanking</span>
              </label>

              <label
                className={`p-2 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === "cod"
                    ? "border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600 shadow-xs"
                    : "border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="accent-blue-600 shrink-0"
                  />
                  <span>Cash on Delivery</span>
                </div>
                <span className="text-3xs text-slate-500 pl-4 mt-0.5">Pay at doorstep</span>
              </label>
            </div>
          </div>

          {/* Action CTA Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-[#fb641b] hover:bg-[#e85a14] disabled:opacity-50 text-white font-bold rounded-md shadow-xs text-xs sm:text-sm transition-colors cursor-pointer"
          >
            {isSubmitting
              ? "Processing..."
              : paymentMethod === "cod"
              ? `Place Order · ${formatINR(total)}`
              : `Proceed to Pay · ${formatINR(total)}`}
          </button>

          {/* Safe & Secure Guarantee */}
          <div className="flex items-center justify-center gap-1.5 text-3xs text-slate-500">
            <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
            </svg>
            <span>100% Safe &amp; Secure Payments · 7-Day Replacement</span>
          </div>
        </div>
      </form>
    </div>
  );
}
