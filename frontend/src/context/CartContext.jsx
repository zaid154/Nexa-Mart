import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

// This context keeps the shopping cart and the wishlist for the whole app.
const CartContext = createContext(null);

// Helper hook so other files can use the cart easily.
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load the cart and wishlist from the server.
  const refresh = useCallback(async () => {
    // If nobody is logged in, just keep empty values.
    if (!user) {
      setCart({ items: [], subtotal: 0, count: 0 });
      setWishlist([]);
      return;
    }
    setLoading(true);
    try {
      // Independent requests, so fetch them together rather than making the
      // wishlist wait for the cart.
      const [cartResponse, wishlistResponse] = await Promise.all([
        api.get("/cart"),
        api.get("/wishlist"),
      ]);
      setCart(cartResponse.data);
      setWishlist(wishlistResponse.data.wishlist);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh whenever the user changes (login or logout). A failure here must
  // not become an unhandled rejection — the empty cart is a fine fallback.
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  // Add a product to the cart. Pass variantId when the shopper picked a
  // specific configuration — the same product in two configurations becomes
  // two separate cart lines.
  const addToCart = async (productId, quantity, variantId = null) => {
    if (!quantity) {
      quantity = 1;
    }
    const res = await api.post("/cart", {
      productId: productId,
      quantity: quantity,
      variantId: variantId,
    });
    setCart(res.data);
  };

  // Change the quantity of a line already in the cart.
  const updateCartItem = async (productId, quantity, variantId = null) => {
    const res = await api.put(`/cart/${productId}`, {
      quantity: quantity,
      variantId: variantId,
    });
    setCart(res.data);
  };

  // Remove a single line from the cart.
  const removeFromCart = async (productId, variantId = null) => {
    const query = variantId ? `?variantId=${variantId}` : "";
    const res = await api.delete(`/cart/${productId}${query}`);
    setCart(res.data);
  };

  // Empty the whole cart.
  const clearCart = async () => {
    const res = await api.delete("/cart");
    setCart(res.data);
  };

  // Add a product to the wishlist.
  const addToWishlist = async (productId) => {
    const res = await api.post("/wishlist", { productId: productId });
    setWishlist(res.data.wishlist);
  };

  // Remove a product from the wishlist.
  const removeFromWishlist = async (productId) => {
    const res = await api.delete(`/wishlist/${productId}`);
    setWishlist(res.data.wishlist);
  };

  // Check if a product is already in the wishlist. Every product card calls
  // this on every render, so look it up in a Set rather than scanning the
  // whole wishlist each time.
  const wishlistIds = useMemo(
    () => new Set(wishlist.map((product) => product._id)),
    [wishlist]
  );
  const inWishlist = useCallback((productId) => wishlistIds.has(productId), [wishlistIds]);

  // Memoised so consumers only re-render when the cart or wishlist actually
  // changes, rather than on every render of the provider's parent.
  const value = useMemo(
    () => ({
      cart,
      wishlist,
      loading,
      refresh,
      addToCart,
      updateCartItem,
      removeFromCart,
      clearCart,
      addToWishlist,
      removeFromWishlist,
      inWishlist,
    }),
    // The mutators are recreated each render but only ever call the API and
    // setState, so they are safe to leave out of the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart, wishlist, loading, refresh, inWishlist]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
