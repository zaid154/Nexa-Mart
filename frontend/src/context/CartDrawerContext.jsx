// Cart drawer state management.
// Splits actions and visibility state into two separate contexts to optimize rendering performance.

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CartDrawerActionsContext = createContext({ open: () => {}, close: () => {} });
const CartDrawerStateContext = createContext(false);

export const CartDrawerProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Memoize action handlers for referential stability
  const actions = useMemo(() => ({ open, close }), [open, close]);

  return (
    <CartDrawerActionsContext.Provider value={actions}>
      <CartDrawerStateContext.Provider value={isOpen}>{children}</CartDrawerStateContext.Provider>
    </CartDrawerActionsContext.Provider>
  );
};

export const useCartDrawer = () => useContext(CartDrawerActionsContext);
export const useCartDrawerOpen = () => useContext(CartDrawerStateContext);
