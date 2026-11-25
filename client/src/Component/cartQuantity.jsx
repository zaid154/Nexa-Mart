// Reusable cart quantity stepper controller.
// Reads real-time quantity directly from CartContext and syncs updates to backend.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext.jsx";
import { useCart } from "../context/cartContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import QuantityStepper from "./quantityStepper.jsx";

// Find a product's line in the cart.
export const findCartLine = (cart, productId) => {
  const items = cart?.items || [];
  return (
    items.find((item) => {
      return String(item.product?._id || item.product?.id || item.product) === String(productId);
    }) || null
  );
};

const CartQuantity = ({ productId, max, size = "sm", variant = "default", onEmpty }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, addToCart, updateCartItem, removeFromCart } = useCart();

  const [busy, setBusy] = useState(false);

  const line = findCartLine(cart, productId);
  const quantity = line ? line.quantity : 0;

  // Dispatches add, update, or remove based on target quantity
  const apply = async (next) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (busy) {
      return;
    }

    setBusy(true);
    try {
      if (next <= 0) {
        await removeFromCart(productId);
        if (onEmpty) {
          onEmpty();
        }
      } else if (next > quantity) {
        await addToCart(productId, next - quantity);
      } else {
        await updateCartItem(productId, next);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (variant === "button") {
    const atMax = typeof max === "number" && quantity >= max;
    return (
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        className={`w-full h-8 sm:h-9 rounded-xs bg-[#ff9f00] text-white flex items-center justify-between px-1.5 shadow-xs select-none ${
          busy ? "opacity-75" : ""
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            apply(quantity - 1);
          }}
          disabled={busy}
          aria-label="Decrease quantity"
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-xs bg-white text-[#ff9f00] font-black text-sm flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          −
        </button>
        <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-white">
          <span className="text-sm font-extrabold">{quantity}</span>
          <span className="text-[10px] font-semibold opacity-95">in cart</span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            apply(quantity + 1);
          }}
          disabled={busy || atMax}
          aria-label="Increase quantity"
          title={atMax ? "No more stock available" : undefined}
          className="w-6 h-6 sm:w-7 sm:h-7 rounded-xs bg-white text-[#ff9f00] font-black text-sm flex items-center justify-center hover:bg-amber-50 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <QuantityStepper
      value={quantity}
      min={0}
      max={max}
      onChange={apply}
      size={size}
      busy={busy}
    />
  );
};

export default CartQuantity;
