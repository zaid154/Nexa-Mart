import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { IconStar, IconGrid, IconHeart, IconCart, IconUser } from "./Icons.jsx";

const MobileBottomNav = () => {
  const { user } = useAuth();
  const { cart, wishlist } = useCart();
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    {
      label: "Home",
      to: "/",
      icon: IconStar,
      isActive: pathname === "/",
    },
    {
      label: "Explore",
      to: "/products",
      icon: IconGrid,
      isActive: pathname.startsWith("/products"),
    },
    {
      label: "Wishlist",
      to: user ? "/wishlist" : "/login",
      icon: IconHeart,
      badge: wishlist.length,
      isActive: pathname === "/wishlist",
    },
    {
      label: "Cart",
      to: "/cart",
      icon: IconCart,
      badge: cart.count,
      isActive: pathname === "/cart",
    },
    {
      label: user ? "Account" : "Login",
      to: user ? "/profile" : "/login",
      icon: IconUser,
      isActive: pathname === "/profile" || pathname === "/login" || pathname === "/register",
    },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-ink-100 py-1.5 px-2 flex items-center justify-around lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = item.isActive;

        return (
          <Link
            key={item.label}
            to={item.to}
            className={`relative flex flex-col items-center justify-center min-w-[60px] py-1 px-1.5 rounded-lg transition-all active:scale-90 ${
              active
                ? "text-accent-500 font-bold"
                : "text-ink-500 hover:text-ink-900 font-medium"
            }`}
          >
            <div className="relative">
              <Icon size={20} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 grid h-4 w-4 place-items-center rounded-full bg-copper-400 text-[10px] font-bold text-white shadow-xs animate-scale-in">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
            <span className="mt-1 text-[11px] leading-tight tracking-tight">
              {item.label}
            </span>
            {active && (
              <span className="absolute top-0 h-0.5 w-6 rounded-full bg-accent-500" />
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
