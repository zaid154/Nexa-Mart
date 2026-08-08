// The panel that slides in from the right after something is added to the cart.
//
// This is the real answer to "add to cart hone ke baad pata hi nahi lagta". The
// only feedback before this was a toast in the bottom-right corner while the
// thing that changed — the cart badge — sits in the top-right. The drawer puts
// the confirmation on top of the item itself, with the quantity control right
// there, so no one has to go looking for proof that the click worked.

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useCartDrawer, useCartDrawerOpen } from "../context/CartDrawerContext.jsx";
import { useCommerce } from "../context/SettingsContext.jsx";
import { formatINR } from "../utils/format.js";
import { lineImage, variantLabel } from "../utils/variantMedia.js";
import { onProductImageError } from "../utils/productImage.js";
import { IconClose, IconEmptyCart } from "./Icons.jsx";
import CartQuantity from "./CartQuantity.jsx";

const CartDrawer = () => {
  const isOpen = useCartDrawerOpen();
  const { close } = useCartDrawer();
  const { cart } = useCart();
  const commerce = useCommerce();
  const closeRef = useRef(null);

  // Escape closes, and the page behind must not scroll while the panel is up.
  // Same handling as the confirm dialog, including restoring whatever overflow
  // was there before rather than blindly clearing it.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        close();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    if (closeRef.current) {
      closeRef.current.focus();
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  if (!isOpen) {
    return null;
  }

  const items = cart.items || [];
  const subtotal = cart.subtotal || 0;
  const threshold = commerce.freeShippingThreshold || 0;
  const shortOfFreeDelivery = threshold > 0 ? threshold - subtotal : 0;

  return (
    <>
      {/* z-80 puts the panel over the sticky navbar (50) but under the confirm
          dialog (90) and the toasts (100), which it may still raise. */}
      <div
        className="fixed inset-0 z-[80] animate-fade-in bg-ink-950/45 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="fixed right-0 top-0 z-[80] flex h-full w-full max-w-[420px] animate-slide-in-right flex-col bg-white shadow-deep"
      >
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          {/* cart.count is the sum of quantities, the same number the navbar
              badge shows — so the two can never disagree. */}
          <h2 className="text-base font-semibold text-ink-900">My Cart ({cart.count || 0})</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <IconClose size={18} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="text-ink-200">
              <IconEmptyCart size={64} />
            </span>
            <p className="text-sm text-ink-500">Your cart is empty.</p>
            <button type="button" onClick={close} className="btn btn-outline btn-sm">
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            {shortOfFreeDelivery > 0 && (
              <div className="border-b border-ink-100 bg-accent-50 px-5 py-2.5 text-xs text-ink-600">
                Add <strong className="text-ink-900">{formatINR(shortOfFreeDelivery)}</strong> more
                for free delivery
              </div>
            )}

            <div className="flex-1 divide-y divide-ink-100 overflow-y-auto">
              {items.map((item) => {
                const product = item.product;
                const variantId = item.variant?._id || null;
                const label = variantLabel(item.variant);
                const available = item.variant
                  ? item.variant.countInStock
                  : product.countInStock;

                return (
                  <div key={`${product._id}-${variantId || "base"}`} className="flex gap-3 px-5 py-4">
                    <Link to={`/products/${product._id}`} onClick={close} className="shrink-0">
                      <img
                        src={lineImage(item)}
                        alt={product.name}
                        width="64"
                        height="64"
                        loading="lazy"
                        decoding="async"
                        onError={onProductImageError}
                        className="h-16 w-16 bg-white object-contain"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link to={`/products/${product._id}`} onClick={close}>
                        <p className="line-clamp-2 text-sm text-ink-900 hover:text-accent-500">
                          {product.name}
                        </p>
                      </Link>
                      {label && <p className="mt-0.5 text-xs text-ink-500">{label}</p>}

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <CartQuantity
                          productId={product._id}
                          variantId={variantId}
                          max={available}
                          size="sm"
                        />
                        <span className="text-sm font-semibold text-ink-900">
                          {formatINR(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="border-t border-ink-100 px-5 py-4">
              {/* Subtotal only. Delivery, tax and the coupon belong on the cart
                  and checkout pages, where they can actually be acted on. */}
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="text-lg font-bold text-ink-900">{formatINR(subtotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link to="/cart" onClick={close} className="btn btn-outline">
                  View cart
                </Link>
                <Link to="/checkout" onClick={close} className="btn btn-buy">
                  Checkout
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </>
  );
};

export default CartDrawer;
