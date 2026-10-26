import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/apiClient.js";
import { useCart } from "../context/cartContext.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import { formatINR } from "../utils/formatUtils.js";
import { payForOrder } from "../utils/paymentUtils.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImageUtils.js";
import { IconShield } from "./icons.jsx";

// Helper to validate complete address per backend requirements
const validateAddress = (addr, defaultName = "") => {
  const clean = {
    fullName: (addr?.fullName || defaultName || "").trim(),
    phone: (addr?.phone || "").trim(),
    line1: (addr?.line1 || "").trim(),
    line2: (addr?.line2 || "").trim(),
    city: (addr?.city || "").trim(),
    state: (addr?.state || "").trim(),
    postalCode: (addr?.postalCode || "").trim(),
    country: addr?.country || "India",
    label: addr?.label || "HOME",
  };

  if (!clean.fullName || clean.fullName.length < 2) {
    return { valid: false, error: "Please enter recipient's full name (at least 2 characters)." };
  }
  if (!/^[6-9]\d{9}$/.test(clean.phone)) {
    return { valid: false, error: "Mobile number must be a 10-digit number starting with 6, 7, 8 or 9." };
  }
  if (!clean.line1 || clean.line1.length < 5) {
    return { valid: false, error: "Address must include house/flat/street details (at least 5 characters)." };
  }
  if (!clean.city || clean.city.length < 2) {
    return { valid: false, error: "Please enter a valid city name." };
  }
  if (!clean.state || clean.state.length < 2) {
    return { valid: false, error: "Please enter your state." };
  }
  if (!/^[1-9]\d{5}$/.test(clean.postalCode)) {
    return { valid: false, error: "Pincode must be 6 digits and cannot start with 0." };
  }

  return { valid: true, clean };
};

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const loadInitialAddress = () => {
    try {
      const fromLocal = JSON.parse(localStorage.getItem("nexamart_shipping_address") || "null");
      if (fromLocal && fromLocal.line1) return fromLocal;
    } catch {
      // Ignore JSON parse errors
    }
    const saved = user?.address || user?.addresses?.[0] || {};
    return {
      fullName: saved.fullName || user?.name || "",
      phone: saved.phone || user?.phone || "",
      line1: saved.line1 || "",
      line2: saved.line2 || "",
      city: saved.city || "",
      state: saved.state || "",
      postalCode: saved.postalCode || "",
      country: saved.country || "India",
      label: saved.label || "HOME",
    };
  };

  const [address, setAddress] = useState(loadInitialAddress);
  const [isEditingAddress, setIsEditingAddress] = useState(() => {
    const init = loadInitialAddress();
    return !validateAddress(init, user?.name).valid;
  });

  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cart?.subtotal || 0;
  const shippingFee = subtotal >= 5000 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shippingFee;

  const mrpTotal = cart?.items?.reduce((sum, item) => {
    const prod = item.product || {};
    const mrp = prod.mrp || item.unitPrice || prod.price || 0;
    return sum + mrp * item.quantity;
  }, 0) || 0;
  const totalSavings = mrpTotal > subtotal ? mrpTotal - subtotal : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAddress((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveAddress = () => {
    const check = validateAddress(address, user?.name);
    if (!check.valid) {
      toast.error(check.error);
      return;
    }
    setAddress(check.clean);
    try {
      localStorage.setItem("nexamart_shipping_address", JSON.stringify(check.clean));
    } catch {
      // Ignore local storage error
    }
    setIsEditingAddress(false);
    toast.success("Delivery address confirmed!");
  };

  const handlePlaceOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const check = validateAddress(address, user?.name);
    if (!check.valid) {
      setIsEditingAddress(true);
      toast.error(check.error);
      return;
    }

    const targetAddress = check.clean;

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

      // 2. Handle COD payment flow
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
            className="mt-4 px-5 py-2.5 bg-[#2874f0] text-white rounded-md text-xs font-semibold hover:bg-blue-700 cursor-pointer"
          >
            Explore Catalog
          </button>
        </div>
      </div>
    );
  }

  const isAddressReady = validateAddress(address, user?.name).valid;

  return (
    <div className="w-full pb-10">
      <div className="mb-4">
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left Column: Flipkart Sequential Steps (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3.5">
          {/* STEP 1: DELIVERY ADDRESS (Flipkart Card / Form) */}
          <div className="bg-white rounded-xs border border-slate-200 overflow-hidden shadow-2xs">
            {/* Step Header */}
            <div
              className={`px-4 py-3 flex items-center justify-between transition-colors ${
                isEditingAddress
                  ? "bg-[#2874f0] text-white"
                  : "bg-white text-slate-800 border-b border-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-5 h-5 rounded-xs text-xs font-bold flex items-center justify-center shrink-0 ${
                    isEditingAddress ? "bg-white text-[#2874f0]" : "bg-[#2874f0] text-white"
                  }`}
                >
                  1
                </span>
                <h2
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isEditingAddress ? "text-white" : "text-slate-800"
                  }`}
                >
                  Delivery Address
                </h2>
                {!isEditingAddress && isAddressReady && (
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {!isEditingAddress && isAddressReady && (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(true)}
                  className="text-xs font-bold text-[#2874f0] hover:text-blue-800 uppercase tracking-wider border border-slate-200 px-3 py-1 rounded-xs bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Change
                </button>
              )}
            </div>

            {/* Step Body: Confirmed View VS Edit Form */}
            {!isEditingAddress && isAddressReady ? (
              <div className="p-4 sm:p-5 bg-blue-50/20">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <div className="w-4 h-4 rounded-full border-4 border-[#2874f0] bg-white shadow-2xs" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{address.fullName}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-xs border border-slate-200">
                        {address.label || "HOME"}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{address.phone}</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} -{" "}
                      <span className="font-bold text-slate-800">{address.postalCode}</span>
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const paymentEl = document.getElementById("checkout-payment-step");
                          if (paymentEl) paymentEl.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="px-6 py-2.5 bg-[#fb641b] hover:bg-[#e85a14] text-white text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Deliver Here
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(true)}
                        className="text-xs font-bold text-[#2874f0] hover:underline uppercase tracking-wide cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={address.fullName}
                      onChange={handleChange}
                      placeholder="Recipient full name"
                      className="w-full p-2.5 bg-white rounded-xs border border-slate-300 focus:border-[#2874f0] focus:ring-1 focus:ring-[#2874f0] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      10-Digit Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={address.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      className="w-full p-2.5 bg-white rounded-xs border border-slate-300 focus:border-[#2874f0] focus:ring-1 focus:ring-[#2874f0] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={address.postalCode}
                      onChange={handleChange}
                      placeholder="6-digit pincode"
                      maxLength={6}
                      className="w-full p-2.5 bg-white rounded-xs border border-slate-300 focus:border-[#2874f0] focus:ring-1 focus:ring-[#2874f0] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Locality / Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      name="line2"
                      value={address.line2 || ""}
                      onChange={handleChange}
                      placeholder="Nearby landmark or locality"
                      className="w-full p-2.5 bg-white rounded-xs border border-slate-300 focus:border-[#2874f0] focus:ring-1 focus:ring-[#2874f0] focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Address (Area and Street) *
                    </label>
                    <textarea
                      name="line1"
                      rows={2}
                      value={address.line1}
                      onChange={handleChange}
                      placeholder="Flat / House No. / Building / Street / Sector"
                      className="w-full p-2.5 bg-white rounded-xs border border-slate-300 focus:border-[#2874f0] focus:ring-1 focus:ring-[#2874f0] focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      City / District / Town *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={address.city}
                      onChange={handleChange}
                      placeholder="City"
                      className="w-full p-2.5 bg-white rounded-xs border border-slate-300 focus:border-[#2874f0] focus:ring-1 focus:ring-[#2874f0] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={address.state}
                      onChange={handleChange}
                      placeholder="State"
                      className="w-full p-2.5 bg-white rounded-xs border border-slate-300 focus:border-[#2874f0] focus:ring-1 focus:ring-[#2874f0] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Address Type Radios */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <label className="block text-2xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Address Type
                  </label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="label"
                        value="HOME"
                        checked={(address.label || "HOME") === "HOME"}
                        onChange={() => setAddress((prev) => ({ ...prev, label: "HOME" }))}
                        className="accent-[#2874f0]"
                      />
                      <span>Home (All day delivery)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                      <input
                        type="radio"
                        name="label"
                        value="WORK"
                        checked={address.label === "WORK"}
                        onChange={() => setAddress((prev) => ({ ...prev, label: "WORK" }))}
                        className="accent-[#2874f0]"
                      />
                      <span>Work (Delivery between 10 AM - 5 PM)</span>
                    </label>
                  </div>
                </div>

                {/* Buttons */}
                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveAddress}
                    className="px-6 py-2.5 bg-[#fb641b] hover:bg-[#e85a14] text-white text-xs font-bold uppercase tracking-wider rounded-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Save and Deliver Here
                  </button>
                  {isAddressReady && (
                    <button
                      type="button"
                      onClick={() => setIsEditingAddress(false)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wide px-3 py-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: ORDER SUMMARY */}
          <div className="bg-white rounded-xs border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-xs bg-[#2874f0] text-white text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Order Summary ({cart.items.length} {cart.items.length === 1 ? "Item" : "Items"})
                </h2>
              </div>
              <Link
                to="/cart"
                className="text-2xs font-bold uppercase tracking-wider text-[#2874f0] hover:underline"
              >
                Change
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {cart.items.map((item, idx) => {
                const prod = item.product || {};
                const img = prod.images?.[0] || prod.image || PRODUCT_IMAGE_PLACEHOLDER;
                const unitPrice = item.unitPrice || prod.price || 0;
                const mrp = prod.mrp || unitPrice;

                return (
                  <div key={idx} className="p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4">
                    <img
                      src={img}
                      alt={prod.name}
                      onError={onProductImageError}
                      className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xs border border-slate-200 p-1 bg-white shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${prod._id}`}
                        className="text-xs sm:text-sm font-semibold text-slate-900 hover:text-[#2874f0] truncate block"
                      >
                        {prod.name || "Product"}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {formatINR(unitPrice)}
                        </span>
                        {mrp > unitPrice && (
                          <span className="text-2xs text-slate-400 line-through">
                            {formatINR(mrp)}
                          </span>
                        )}
                        <span className="text-2xs text-slate-500 font-medium ml-1">
                          Qty: {item.quantity}
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-600 block mt-0.5">
                        Free delivery by tomorrow
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">
                        {formatINR(unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: PAYMENT OPTIONS */}
          <div id="checkout-payment-step" className="bg-white rounded-xs border border-slate-200 overflow-hidden shadow-2xs">
            <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-xs bg-[#2874f0] text-white text-xs font-bold flex items-center justify-center shrink-0">
                3
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Payment Options
              </h2>
            </div>

            <div className="p-4 sm:p-5 divide-y divide-slate-100">
              {/* Online Razorpay */}
              <label
                className={`py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentMethod === "razorpay" ? "text-blue-900" : "text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
                  className="mt-1 accent-[#2874f0] shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold">Online Payment (Razorpay)</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold border border-emerald-200">
                      Recommended
                    </span>
                  </div>
                  <span className="text-2xs text-slate-500 block mt-0.5">
                    UPI (Google Pay, PhonePe, Paytm), Credit / Debit Card, Net Banking &amp; Wallets
                  </span>
                </div>
              </label>

              {/* Cash on Delivery */}
              <label
                className={`py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                  paymentMethod === "cod" ? "text-blue-900" : "text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mt-1 accent-[#2874f0] shrink-0"
                />
                <div>
                  <span className="text-xs sm:text-sm font-bold block">Cash on Delivery (COD)</span>
                  <span className="text-2xs text-slate-500 block mt-0.5">
                    Pay with cash or UPI QR at your doorstep upon delivery
                  </span>
                </div>
              </label>
            </div>

            {/* Bottom Place Order CTA inside Payment Card */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <span className="text-2xs text-slate-500">
                Order confirmation email will be sent to <strong>{user?.email || "your email"}</strong>
              </span>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#fb641b] hover:bg-[#e85a14] disabled:opacity-50 text-white font-bold rounded-xs shadow-xs text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer"
              >
                {isSubmitting
                  ? "Processing..."
                  : paymentMethod === "cod"
                  ? `Place Order · ${formatINR(total)}`
                  : `Pay · ${formatINR(total)}`}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Flipkart PRICE DETAILS Card (4 cols) */}
        <div className="lg:col-span-4 sticky top-4 flex flex-col gap-4">
          <div className="bg-white rounded-xs border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100">
              Price Details
            </h2>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Price ({cart.items.length} items)</span>
                <span className="font-semibold text-slate-900">
                  {formatINR(mrpTotal > subtotal ? mrpTotal : subtotal)}
                </span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">− {formatINR(totalSavings)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Delivery Charges</span>
                <span className="font-semibold text-emerald-600">
                  {shippingFee === 0 ? "FREE" : formatINR(shippingFee)}
                </span>
              </div>

              <div className="flex justify-between text-sm sm:text-base font-bold text-slate-900 pt-3 border-t border-slate-100">
                <span>Total Payable</span>
                <span className="text-[#2874f0]">{formatINR(total)}</span>
              </div>
            </div>

            {totalSavings > 0 && (
              <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-xs border border-emerald-100">
                You will save {formatINR(totalSavings)} on this order
              </div>
            )}

            {/* Quick checkout CTA button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-[#fb641b] hover:bg-[#e85a14] disabled:opacity-50 text-white font-bold rounded-xs shadow-xs text-xs sm:text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              {isSubmitting
                ? "Processing..."
                : paymentMethod === "cod"
                ? `Place Order · ${formatINR(total)}`
                : `Proceed to Pay · ${formatINR(total)}`}
            </button>
          </div>

          {/* Flipkart / Amazon Trust Badge */}
          <div className="flex items-center gap-3 px-2 py-1 text-slate-500 text-xs">
            <IconShield size={28} className="text-slate-400 shrink-0" />
            <p className="text-[11px] leading-relaxed text-slate-500">
              Safe and Secure Payments. 100% Authentic products. Easy 7-day returns.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
