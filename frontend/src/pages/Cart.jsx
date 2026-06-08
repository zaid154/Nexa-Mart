import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatINR } from "../utils/format.js";
import { SkeletonCart } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { onProductImageError } from "../utils/productImage.js";

const COUPONS = { NEXA15: 0.15, WELCOME10: 0.1 };

export default function Cart() {
  const { cart, loading, updateCartItem, removeFromCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);

  if (loading) return <SkeletonCart />;

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

  const change = async (productId, quantity) => {
    try {
      await updateCartItem(productId, quantity);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.info("Item removed");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    if (COUPONS[code]) {
      setDiscount(COUPONS[code]);
      toast.success(`Coupon ${code} applied (${COUPONS[code] * 100}% off)`);
    } else {
      setDiscount(0);
      toast.error("Invalid coupon code");
    }
  };

  const discountAmount = Math.round(cart.subtotal * discount);
  const discountedSubtotal = cart.subtotal - discountAmount;
  const shipping = discountedSubtotal >= 5000 ? 0 : 99;
  const tax = Math.round(discountedSubtotal * 0.18);
  const total = discountedSubtotal + shipping + tax;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Your bag"
        title="Shopping Cart"
        subtitle={`${cart.count} item${cart.count > 1 ? "s" : ""} in your cart`}
      />

      <div className="cart-layout">
        <div className="cart-items-list">
          {cart.items.map(({ product, quantity, lineTotal }) => (
            <div key={product._id} className="cart-line">
              <Link to={`/products/${product._id}`}>
                <img
                  src={product.images?.[0]}
                  alt={product.name}
                  className="cart-line-img"
                  loading="lazy"
                  onError={onProductImageError}
                />
              </Link>
              <div className="cart-line-info">
                <Link to={`/products/${product._id}`}>
                  <h3>{product.name}</h3>
                </Link>
                <span className="muted font-sm">{product.brand}</span>
                <div className="row gap-3 mt-3">
                  <div className="qty">
                    <button
                      type="button"
                      onClick={() => change(product._id, quantity - 1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => change(product._id, quantity + 1)}
                      disabled={quantity >= product.countInStock}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => remove(product._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="cart-line-price">
                <strong>{formatINR(lineTotal)}</strong>
                <span className="muted font-sm">{formatINR(product.price)} each</span>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary card">
          <h3>Order Summary</h3>

          <div className="coupon-row">
            <input
              className="input"
              placeholder="Coupon code (e.g. NEXA15)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              aria-label="Coupon code"
            />
            <button type="button" className="btn btn-outline" onClick={applyCoupon}>
              Apply
            </button>
          </div>

          <div className="summary-row">
            <span className="muted">Subtotal</span>
            <span>{formatINR(cart.subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="summary-row">
              <span className="muted">Discount ({discount * 100}%)</span>
              <span className="text-success">−{formatINR(discountAmount)}</span>
            </div>
          )}
          <div className="summary-row">
            <span className="muted">Shipping</span>
            <span>{shipping === 0 ? "Free" : formatINR(shipping)}</span>
          </div>
          <div className="summary-row">
            <span className="muted">Estimated tax (18%)</span>
            <span>{formatINR(tax)}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          <button type="button" className="btn btn-block mt-4" onClick={() => navigate("/checkout")}>
            Proceed to checkout
          </button>
          <Link to="/products" className="btn btn-ghost btn-block mt-3">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
