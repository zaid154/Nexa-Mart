// Whether the slide-in cart panel is showing.
//
// Deliberately two contexts rather than one. The actions object never changes
// identity, so the product tiles that only need `open` never re-render when the
// panel opens or closes; only the drawer itself subscribes to the boolean. A
// forty-tile grid re-rendering on every open is exactly what this avoids — and
// it is why this does not just live as another field on CartContext, which
// every tile already subscribes to for the wishlist heart.

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CartDrawerActionsContext = createContext({ open: () => {}, close: () => {} });
const CartDrawerStateContext = createContext(false);

export const CartDrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Empty dep list on purpose: this object must stay referentially stable.
  const actions = useMemo(() => ({ open, close }), [open, close]);

  return (
    <CartDrawerActionsContext.Provider value={actions}>
      <CartDrawerStateContext.Provider value={isOpen}>{children}</CartDrawerStateContext.Provider>
    </CartDrawerActionsContext.Provider>
  );
};

export const useCartDrawer = () => useContext(CartDrawerActionsContext);
export const useCartDrawerOpen = () => useContext(CartDrawerStateContext);
