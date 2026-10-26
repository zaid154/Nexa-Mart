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

const CartQuantity = ({ productId, max, size = "sm", onEmpty }) => {
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
