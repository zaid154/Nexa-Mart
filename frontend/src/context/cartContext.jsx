import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import api from "../api/apiClient.js";
import { useAuth } from "./authContext.jsx";

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

// Backwards-compatible drawer helpers
export const useCartDrawer = () => {
  const { openDrawer, closeDrawer } = useCart() || {};
  return { open: openDrawer || (() => {}), close: closeDrawer || (() => {}) };
};
export const useCartDrawerOpen = () => {
  const { isDrawerOpen } = useCart() || {};
  return Boolean(isDrawerOpen);
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  // Fetch cart & wishlist from backend when user is logged in
  const refresh = useCallback(async () => {
    if (!user) {
      setCart({ items: [], subtotal: 0, count: 0 });
      setWishlist([]);
      return;
    }
    setLoading(true);
    try {
      const [cartRes, wishRes] = await Promise.all([
        api.get("/cart"),
        api.get("/wishlist"),
      ]);
      setCart(cartRes.data);
      setWishlist(wishRes.data?.wishlist || []);
    } catch {
      // Fallback cleanly on network failure
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = async (productId, quantity = 1, variantId = null) => {
    const res = await api.post("/cart", { productId, quantity, variantId });
    setCart(res.data);
    openDrawer();
  };

  const updateCartItem = async (productId, quantity, variantId = null) => {
    const res = await api.put(`/cart/${productId}`, { quantity, variantId });
    setCart(res.data);
  };

  const removeFromCart = async (productId, variantId = null) => {
    const query = variantId ? `?variantId=${variantId}` : "";
    const res = await api.delete(`/cart/${productId}${query}`);
    setCart(res.data);
  };

  const clearCart = async () => {
    const res = await api.delete("/cart");
    setCart(res.data);
  };

  const addToWishlist = async (productId) => {
    const res = await api.post("/wishlist", { productId });
    setWishlist(res.data?.wishlist || []);
  };

  const removeFromWishlist = async (productId) => {
    const res = await api.delete(`/wishlist/${productId}`);
    setWishlist(res.data?.wishlist || []);
  };

  const inWishlist = useCallback(
    (productId) => wishlist.some((item) => (item._id || item) === productId),
    [wishlist]
  );

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
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [cart, wishlist, loading, refresh, inWishlist, isDrawerOpen, openDrawer, closeDrawer]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
