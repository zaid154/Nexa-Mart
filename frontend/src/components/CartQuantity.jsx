// A QuantityStepper wired straight to the cart. Drop it anywhere a product is
// shown and it edits that product's line: the tile, the product page, the cart
// drawer. It reads the quantity from the cart itself, so the number on screen
// is always the number the server has — the product page used to show a local
// counter that never matched, which is why adding twice looked like nothing
// happened.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import QuantityStepper from "./QuantityStepper.jsx";

// Find a product's line in the cart. A line is identified by the product plus
// the chosen variant, so the same product in two configurations is two lines.
export const findCartLine = (cart, productId, variantId) => {
  const items = cart?.items || [];
  return (
    items.find(
      (item) =>
        item.product?._id === productId &&
        String(item.variant?._id || "") === String(variantId || "")
    ) || null
  );
};

const CartQuantity = ({ productId, variantId = null, max, size = "sm", onEmpty }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, addToCart, updateCartItem, removeFromCart } = useCart();

  const [busy, setBusy] = useState(false);

  const line = findCartLine(cart, productId, variantId);
  const quantity = line ? line.quantity : 0;

  // The three cart endpoints do not agree on what a quantity means, so the
  // direction of the click decides which one to call:
  //   POST /cart      adds to what is already there (a delta)
  //   PUT  /cart/:id  sets an absolute value, and rejects anything below 1
  //   DELETE          is therefore the only way to reach zero
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
        await removeFromCart(productId, variantId);
        if (onEmpty) {
          onEmpty();
        }
      } else if (next > quantity) {
        await addToCart(productId, next - quantity, variantId);
      } else {
        await updateCartItem(productId, next, variantId);
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
