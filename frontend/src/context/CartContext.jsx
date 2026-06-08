import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";

const CartContext = createContext(null);

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0, count: 0 });
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart({ items: [], subtotal: 0, count: 0 });
      setWishlist([]);
      return;
    }
    setLoading(true);
    try {
      const [c, w] = await Promise.all([api.get("/cart"), api.get("/wishlist")]);
      setCart(c.data);
      setWishlist(w.data.wishlist);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = async (productId, quantity = 1) => {
    const res = await api.post("/cart", { productId, quantity });
    setCart(res.data);
  };

  const updateCartItem = async (productId, quantity) => {
    const res = await api.put(`/cart/${productId}`, { quantity });
    setCart(res.data);
  };

  const removeFromCart = async (productId) => {
    const res = await api.delete(`/cart/${productId}`);
    setCart(res.data);
  };

  const clearCart = async () => {
    const res = await api.delete("/cart");
    setCart(res.data);
  };

  const addToWishlist = async (productId) => {
    const res = await api.post("/wishlist", { productId });
    setWishlist(res.data.wishlist);
  };

  const removeFromWishlist = async (productId) => {
    const res = await api.delete(`/wishlist/${productId}`);
    setWishlist(res.data.wishlist);
  };

  const inWishlist = (productId) => wishlist.some((p) => p._id === productId);

  return (
    <CartContext.Provider
      value={{
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
