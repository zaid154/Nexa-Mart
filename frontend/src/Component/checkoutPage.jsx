import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/apiClient.js";
import { useCart } from "../context/cartContext.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import { formatINR } from "../utils/formatUtils.js";
import { payForOrder } from "../utils/paymentUtils.js";

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    line1: user?.address?.line1 || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    postalCode: user?.address?.postalCode || "",
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

    if (!address.name || !address.phone || !address.line1 || !address.city || !address.postalCode) {
      toast.error("Please fill in all required delivery address fields.");
      return;
    }

    if (cart.items.length === 0) {
      toast.error("Your cart is empty.");
      navigate("/products");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create order on backend
      const { data } = await api.post("/orders", {
        shippingAddress: address,
        paymentMethod,
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
        address,
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
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg border border-slate-200 text-center shadow-xs">
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
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Delivery Address & Payment Method (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Step 1: Delivery Address */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Delivery Address
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={address.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter full recipient name"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={address.phone}
                  onChange={handleChange}
                  required
                  placeholder="10-digit mobile number"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  name="line1"
                  value={address.line1}
                  onChange={handleChange}
                  required
                  placeholder="House/Flat No., Building Name, Street Area"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Town *</label>
                <input
                  type="text"
                  name="city"
                  value={address.city}
                  onChange={handleChange}
                  required
                  placeholder="City"
                  className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={address.state}
                    onChange={handleChange}
                    placeholder="State"
                    className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={address.postalCode}
                    onChange={handleChange}
                    required
                    placeholder="6 digits"
                    className="w-full text-xs p-2.5 rounded border border-slate-300 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Payment Method */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                Payment Option
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              <label
                className={`flex items-start gap-3.5 p-4 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === "razorpay"
                    ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => setPaymentMethod("razorpay")}
                  className="mt-1 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Online Payment (Razorpay)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pay securely via UPI (Google Pay, PhonePe, Paytm), Cards, or Net Banking.</p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3.5 p-4 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === "cod"
                    ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mt-1 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Cash on Delivery (COD)</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pay in cash or UPI directly when your shipment arrives at your doorstep.</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col gap-5 sticky top-24">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 pb-3 border-b border-slate-100">
            Order Summary ({cart.items.length} items)
          </h2>

          {/* Items thumbnail list */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1">
            {cart.items.map((item, idx) => {
              const p = item.product || {};
              const img = p.images?.[0] || p.image || "https://placehold.co/100x100?text=Product";
              return (
                <div key={idx} className="py-2.5 flex items-center gap-3">
                  <img src={img} alt="" className="w-12 h-12 rounded object-contain border p-1 bg-slate-50" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name || "Product"}</p>
                    <p className="text-2xs text-slate-500">Qty: {item.quantity} · {formatINR(item.unitPrice || p.price)}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    {formatINR((item.unitPrice || p.price) * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pricing calculations */}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs">
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
            <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-100">
              <span>Total Payable</span>
              <span className="text-blue-600">{formatINR(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-[#fb641b] hover:bg-[#e85a14] disabled:opacity-50 text-white font-bold rounded-md shadow-xs text-sm transition-colors mt-2"
          >
            {isSubmitting ? "Processing..." : paymentMethod === "cod" ? `Place Order · ${formatINR(total)}` : `Proceed to Pay · ${formatINR(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
