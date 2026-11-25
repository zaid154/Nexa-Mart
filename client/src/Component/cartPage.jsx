import { IconShield } from "./icons.jsx";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/cartContext.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import { formatINR } from "../utils/formatUtils.js";

export default function CartPage() {
  const { cart, loading, updateCartItem, removeFromCart, addToWishlist } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg border border-slate-200 text-center shadow-xs">
        <h2 className="text-lg font-bold text-slate-800">Please Sign In</h2>
        <p className="text-xs text-slate-500 mt-1">Sign in to view your cart items and saved products.</p>
        <Link
          to="/login"
          className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg border border-slate-200 text-center shadow-xs">
        <div className="w-16 h-16 mx-auto mb-3 text-slate-300">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500 mt-1">Explore our latest electronics deals and add items to your cart.</p>
        <Link
          to="/products"
          className="mt-5 inline-block px-5 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  const subtotal = cart.subtotal || 0;
  const shipping = subtotal >= 5000 || subtotal === 0 ? 0 : 99;
  const total = subtotal + shipping;

  const mrpTotal = cart.items.reduce((sum, item) => {
    const prod = item.product || {};
    const mrp = prod.mrp || item.unitPrice || prod.price || 0;
    return sum + mrp * item.quantity;
  }, 0);
  const totalSavings = mrpTotal > subtotal ? mrpTotal - subtotal : 0;

  const handleQuantity = async (productId, currentQty, delta) => {
    const next = currentQty + delta;
    if (next <= 0) {
      handleRemove(productId);
      return;
    }
    try {
      await updateCartItem(productId, next);
    } catch (err) {
      toast.error(err.message || "Failed to update quantity");
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.success("Item removed from cart");
    } catch (err) {
      toast.error(err.message || "Failed to remove item");
    }
  };

  const handleSaveForLater = async (productId) => {
    try {
      await addToWishlist(productId);
      await removeFromCart(productId);
      toast.success("Moved to wishlist");
    } catch (err) {
      toast.error(err.message || "Could not move to wishlist");
    }
  };

  return (
    <div className="w-full pb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">
        Shopping Cart ({cart.items.length} {cart.items.length === 1 ? "item" : "items"})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Cart Items List (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 divide-y divide-slate-100 shadow-xs">
          {cart.items.map((item) => {
            const prod = item.product || {};
            const price = item.unitPrice || prod.price || 0;
            const img = prod.images?.[0] || prod.image || "https://placehold.co/150x150?text=Product";

            return (
              <div key={item._id || prod._id} className="p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                {/* Product thumbnail */}
                <Link to={`/products/${prod._id}`} className="shrink-0 w-24 h-24 rounded border border-slate-100 p-2 bg-slate-50 flex items-center justify-center">
                  <img src={img} alt={prod.name} className="max-h-full max-w-full object-contain" />
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${prod._id}`} className="text-sm font-bold text-slate-900 hover:text-blue-600 line-clamp-2">
                    {prod.name}
                  </Link>



                  <div className="flex items-baseline gap-2.5 mt-2">
                    <span className="text-base font-bold text-slate-900">{formatINR(price)}</span>
                    {prod.mrp > price && (
                      <span className="text-xs text-slate-400 line-through">{formatINR(prod.mrp)}</span>
                    )}
                  </div>

                  {/* Actions: Stepper + Remove + Save for Later */}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center border border-slate-300 rounded">
                      <button
                        type="button"
                        onClick={() => handleQuantity(prod._id, item.quantity, -1)}
                        className="px-2.5 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-slate-800">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleQuantity(prod._id, item.quantity, 1)}
                        className="px-2.5 py-0.5 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveForLater(prod._id)}
                      className="text-xs font-semibold text-slate-600 hover:text-blue-600"
                    >
                      Save for Later
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemove(prod._id)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Price Breakdown Card (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 sticky top-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100">
              Price Details
            </h2>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Price ({cart.items.length} items)</span>
                <span className="font-semibold">{formatINR(mrpTotal > subtotal ? mrpTotal : subtotal)}</span>
              </div>

              {totalSavings > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">- {formatINR(totalSavings)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Delivery Charges</span>
                <span className="font-semibold text-emerald-600">
                  {shipping === 0 ? "FREE" : formatINR(shipping)}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-slate-900 pt-3 border-t border-slate-100">
                <span>Total Amount</span>
                <span className="text-blue-600">{formatINR(total)}</span>
              </div>
            </div>

            {totalSavings > 0 && (
              <div className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-2 rounded border border-emerald-100">
                You will save {formatINR(totalSavings)} on this order
              </div>
            )}

            {subtotal < 5000 && (
              <p className="text-2xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-100">
                Add items worth <strong>{formatINR(5000 - subtotal)}</strong> more to get <strong>FREE Delivery</strong>.
              </p>
            )}

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="w-full py-3.5 px-4 bg-[#fb641b] hover:bg-[#e85a14] text-white font-bold rounded-md shadow-xs text-sm uppercase tracking-wider transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>

          {/* Flipkart / Amazon style Trust Assurance below price card */}
          <div className="flex items-center gap-3 px-3 py-1 text-slate-500 text-xs">
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
