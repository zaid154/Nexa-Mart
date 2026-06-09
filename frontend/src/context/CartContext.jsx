import { createContext, useContext, useEffect, useState, useCallback } from "react";
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
      const cartResponse = await api.get("/cart");
      const wishlistResponse = await api.get("/wishlist");
      setCart(cartResponse.data);
      setWishlist(wishlistResponse.data.wishlist);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh whenever the user changes (login or logout).
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Add a product to the cart.
  const addToCart = async (productId, quantity) => {
    if (!quantity) {
      quantity = 1;
    }
    const res = await api.post("/cart", { productId: productId, quantity: quantity });
    setCart(res.data);
  };

  // Change the quantity of a product already in the cart.
  const updateCartItem = async (productId, quantity) => {
    const res = await api.put(`/cart/${productId}`, { quantity: quantity });
    setCart(res.data);
  };

  // Remove a single product from the cart.
  const removeFromCart = async (productId) => {
    const res = await api.delete(`/cart/${productId}`);
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

  // Check if a product is already in the wishlist.
  const inWishlist = (productId) => {
    return wishlist.some((product) => product._id === productId);
  };

  const value = {
    cart: cart,
    wishlist: wishlist,
    loading: loading,
    refresh: refresh,
    addToCart: addToCart,
    updateCartItem: updateCartItem,
    removeFromCart: removeFromCart,
    clearCart: clearCart,
    addToWishlist: addToWishlist,
    removeFromWishlist: removeFromWishlist,
    inWishlist: inWishlist,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
