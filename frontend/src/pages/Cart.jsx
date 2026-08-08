import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import PriceDetails from "../components/PriceDetails.jsx";
import { formatINR } from "../utils/format.js";
import { SkeletonCart } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage.js";
import { useCommerce } from "../context/SettingsContext.jsx";
import { calculateTotals, calculateSavings, deliveryEstimate } from "../utils/pricing.js";
import { mediaForVariant, mediaFromProduct } from "../utils/variantMedia.js";
import CartQuantity from "../components/CartQuantity.jsx";

// Shopping cart page where the user reviews and edits items before checkout.
const Cart = () => {
  // Quantity edits go through CartQuantity now, so this page no longer calls
  // updateCartItem itself.
  const { cart, loading, removeFromCart, addToWishlist, wishlist, removeFromWishlist, addToCart } =
    useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const commerce = useCommerce();

  const [coupon, setCoupon] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // A validated discount is only correct for the cart it was checked against,
  // because coupons carry minimum-order and cap rules. If the cart changes,
  // drop it so the user re-applies and we never show a stale total.
  const subtotal = cart.subtotal;
  useEffect(() => {
    setDiscountAmount(0);
    setAppliedCode("");
  }, [subtotal]);

  if (loading) {
    return <SkeletonCart />;
  }

  if (!user) {
    return (
      <EmptyState
        eyebrow="Cart"
        title="Sign in required"
        message="Please sign in to view your cart."
        icon="cart"
        action={<Link to="/login" className="btn">Sign in</Link>}
      />
    );
  }

  if (cart.items.length === 0) {
    return (
      <EmptyState
        eyebrow="Cart"
        title="Your cart is empty"
        message="Discover our latest electronics and add items to your cart."
        icon="cart"
        action={<Link to="/products" className="btn">Start shopping</Link>}
      />
    );
  }

  // Remove one line from the cart.
  const remove = async (productId, variantId) => {
    try {
      await removeFromCart(productId, variantId);
      toast.info("Item removed");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Move a line out of the cart and into the wishlist ("save for later").
  const saveForLater = async (productId, variantId) => {
    try {
      await addToWishlist(productId);
      await removeFromCart(productId, variantId);
      toast.success("Saved for later");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Move a saved item back into the cart.
  const moveToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      await removeFromWishlist(productId);
      toast.success("Moved to cart");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Ask the server to validate the coupon and tell us the discount in rupees.
  // The server checks expiry, minimum order, per-user limits and the maximum
  // discount cap against the real cart, so what we show here is what the order
  // will actually charge.
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

  const clearCoupon = () => {
    setDiscountAmount(0);
    setAppliedCode("");
    setCoupon("");
  };

  // All totals come from the admin's commerce rules — the same numbers the
  // server will use when the order is placed.
  const { shipping, tax, total } = calculateTotals({
    subtotal: cart.subtotal,
    discount: discountAmount,
    commerce,
  });
  const savings = calculateSavings({
    items: cart.items,
    subtotal: cart.subtotal,
    discount: discountAmount,
    shipping,
    commerce,
  });

  const eta = deliveryEstimate(commerce);

  const savedAddress = user.address;

  return (
    <div className="grid animate-fade-in items-start gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex min-w-0 flex-col gap-3">
        {/* ── Deliver-to strip ───────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 shadow-card">
          <p className="min-w-0 text-sm text-ink-700">
            {savedAddress ? (
              <>
                Deliver to:{" "}
                <span className="font-semibold text-ink-900">
                  {savedAddress.fullName?.split(" ")[0] || user.name.split(" ")[0]},{" "}
                  {savedAddress.postalCode}
                </span>
                <span className="ml-2 hidden text-xs text-ink-400 sm:inline">
                  {savedAddress.line1}, {savedAddress.city}
                </span>
              </>
            ) : (
              <>No delivery address saved yet</>
            )}
          </p>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="shrink-0 rounded-sm border border-ink-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-accent-500 transition-colors hover:border-accent-500"
          >
            {savedAddress ? "Change" : "Add address"}
          </button>
        </div>

        {/* ── Line items ─────────────────────────────── */}
        <div className="bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h1 className="text-base font-medium text-ink-900">My Cart ({cart.count})</h1>
          <span className="text-xs text-ink-400">Delivery by {eta}</span>
        </div>

        <div className="divide-y divide-ink-100">
          {cart.items.map((item) => {
            const product = item.product;
            const quantity = item.quantity;
            const variantId = item.variant?._id || null;
            const available = item.variant ? item.variant.countInStock : product.countInStock;
            const atStockLimit = quantity >= available;
            // Configuration label, e.g. "256 GB, Sierra Blue".
            const variantLabel = item.variant
              ? Object.values(item.variant.attributes || {}).join(", ")
              : "";
            // Show the colourway that was actually bought, not the product's
            // default photo.
            const variantImage =
              mediaForVariant(mediaFromProduct(product), item.variant?.attributes)[0]?.url ||
              product.images?.[0] ||
              PRODUCT_IMAGE_PLACEHOLDER;
            // Line MRP follows the same discount ratio as the base product.
            const lineMrp =
              product.mrp > product.price
                ? Math.round(item.unitPrice * (product.mrp / product.price)) * quantity
                : 0;
            const discount = lineMrp
              ? Math.round(((lineMrp - item.lineTotal) / lineMrp) * 100)
              : 0;

            return (
              <div key={`${product._id}-${variantId || "base"}`} className="flex gap-3 sm:gap-4 px-3 sm:px-5 py-4 sm:py-5">
                {/* Image + quantity stepper */}
                <div className="flex w-20 sm:w-[112px] shrink-0 flex-col items-center gap-2 sm:gap-3">
                  <Link to={`/products/${product._id}`}>
                    <img
                      src={variantImage}
                      alt={product.name}
                      width="112"
                      height="112"
                      className="h-20 w-20 sm:h-[112px] sm:w-[112px] bg-white object-contain"
                      loading="lazy"
                      decoding="async"
                      onError={onProductImageError}
                    />
                  </Link>
                  {/* Stepping down to zero removes the line. The old control
                      disabled "−" at 1, because PUT /cart rejects a quantity
                      below 1 — CartQuantity routes that case to DELETE
                      instead. It also guards against the double-fire the old
                      buttons had, since nothing was disabled mid-request. */}
                  <CartQuantity
                    productId={product._id}
                    variantId={variantId}
                    max={available}
                    size="sm"
                  />
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <Link to={`/products/${product._id}`}>
                    <h3 className="line-clamp-2 text-xs sm:text-[15px] font-medium text-ink-900 hover:text-accent-500">
                      {product.name}
                    </h3>
                  </Link>
                  {variantLabel && (
                    <p className="mt-0.5 text-xs text-ink-500">{variantLabel}</p>
                  )}
                  {commerce.sellerName && (
                    <p className="mt-1 text-xs text-ink-400">
                      Seller: {commerce.sellerName}
                      <span className="ml-2 font-semibold text-accent-500 hidden sm:inline">Assured</span>
                    </p>
                  )}

                  <div className="price-row mt-1.5 sm:mt-2">
                    <span className="text-base sm:text-lg font-medium text-ink-900">
                      {formatINR(item.lineTotal)}
                    </span>
                    {discount > 0 && (
                      <>
                        <span className="price-mrp text-xs sm:text-sm">{formatINR(lineMrp)}</span>
                        <span className="price-off text-xs sm:text-sm">{discount}% off</span>
                      </>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-ink-500">
                    Delivery by <span className="font-semibold text-ink-800">{eta}</span> ·{" "}
                    <span className="text-success">Free</span>
                  </p>

                  {atStockLimit && (
                    <p className="mt-1 text-xs font-medium text-warning">
                      Only {available} left in stock
                    </p>
                  )}

                  <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-4 sm:gap-6">
                    <button
                      type="button"
                      className="text-xs sm:text-sm font-bold uppercase tracking-wide text-ink-700 transition-colors hover:text-accent-500"
                      onClick={() => saveForLater(product._id, variantId)}
                    >
                      Save for later
                    </button>
                    <button
                      type="button"
                      className="text-xs sm:text-sm font-bold uppercase tracking-wide text-ink-700 transition-colors hover:text-danger"
                      onClick={() => remove(product._id, variantId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky place-order bar */}
        <div className="sticky bottom-0 flex justify-end border-t border-ink-100 bg-white px-4 sm:px-5 py-3 sm:py-3.5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            className="btn btn-buy w-full sm:w-auto min-w-[200px]"
            onClick={() => navigate("/checkout", { state: { coupon: appliedCode } })}
          >
            Place Order
          </button>
        </div>
        </div>

        {/* ── Saved for later ────────────────────────── */}
        {wishlist.length > 0 && (
          <div className="bg-white shadow-card">
            <h2 className="border-b border-ink-100 px-5 py-3.5 text-base font-medium text-ink-900">
              Saved For Later ({wishlist.length})
            </h2>
            <div className="divide-y divide-ink-100">
              {wishlist.map((product) => {
                const discount =
                  product.mrp > product.price
                    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                    : 0;
                const outOfStock = product.countInStock === 0;
                return (
                  <div key={product._id} className="flex gap-4 px-5 py-4">
                    <Link to={`/products/${product._id}`} className="shrink-0">
                      <img
                        src={product.images?.[0] || PRODUCT_IMAGE_PLACEHOLDER}
                        alt={product.name}
                        className="h-20 w-20 bg-white object-contain"
                        loading="lazy"
                        onError={onProductImageError}
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/products/${product._id}`}>
                        <h3 className="line-clamp-1 text-sm text-ink-900 hover:text-accent-500">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-400">{product.brand}</p>
                      <div className="price-row mt-1.5">
                        <span className="text-base font-medium text-ink-900">
                          {formatINR(product.price)}
                        </span>
                        {discount > 0 && (
                          <>
                            <span className="price-mrp text-xs">{formatINR(product.mrp)}</span>
                            <span className="price-off text-xs">{discount}% off</span>
                          </>
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-6">
                        <button
                          type="button"
                          className="text-xs font-bold uppercase tracking-wide text-accent-500 transition-colors hover:text-accent-600 disabled:opacity-40"
                          onClick={() => moveToCart(product._id)}
                          disabled={outOfStock}
                        >
                          {outOfStock ? "Out of stock" : "Move to cart"}
                        </button>
                        <button
                          type="button"
                          className="text-xs font-bold uppercase tracking-wide text-ink-700 transition-colors hover:text-danger"
                          onClick={() => removeFromWishlist(product._id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Price summary ──────────────────────────── */}
      <div className="lg:sticky lg:top-24">
        <PriceDetails
          itemCount={cart.count}
          subtotal={cart.subtotal}
          discountAmount={discountAmount}
          appliedCode={appliedCode}
          shipping={shipping}
          tax={tax}
          total={total}
          savings={savings}
        >
          {appliedCode ? (
            <div className="flex items-center justify-between gap-2 rounded-sm border border-success-edge bg-success-soft px-3 py-2.5">
              <span className="min-w-0 truncate text-sm font-semibold text-success">
                {appliedCode} applied
              </span>
              <button
                type="button"
                className="shrink-0 text-xs font-bold uppercase tracking-wide text-ink-500 transition-colors hover:text-danger"
                onClick={clearCoupon}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="Coupon code (e.g. NEXA15)"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                aria-label="Coupon code"
              />
              <button
                type="button"
                className="btn btn-outline"
                onClick={applyCoupon}
                disabled={applyingCoupon || !coupon.trim()}
              >
                {applyingCoupon ? "..." : "Apply"}
              </button>
            </div>
          )}
        </PriceDetails>

        <Link
          to="/products"
          className="mt-3 block bg-white px-5 py-3 text-center text-sm font-semibold text-accent-500 shadow-card hover:underline"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
};

export default Cart;
