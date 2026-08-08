import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import SearchBar from "./SearchBar.jsx";
import Logo from "./Logo.jsx";
import {
  IconHeart,
  IconCart,
  IconUser,
  IconMenu,
  IconClose,
  IconMapPin,
  IconChevron,
  IconBox,
  IconGrid,
  IconLogout,
  IconTag,
  IconStar,
} from "./Icons.jsx";

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { cart, wishlist } = useCart();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [locationText, setLocationText] = useState("Select delivery location");

  const loginRef = useRef(null);
  const moreRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (event) => {
      if (loginRef.current && !loginRef.current.contains(event.target)) {
        setLoginDropdownOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setMoreDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    setLoginDropdownOpen(false);
    setMenuOpen(false);
    navigate("/");
  };

  const promptLocation = () => {
    const loc = window.prompt("Enter your Delivery Pincode or City:", "Mumbai 400001");
    if (loc) {
      setLocationText(loc);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-accent-500 shadow-md">
        {/* Top Header Bar */}
        <div className="mx-auto flex h-[64px] max-w-[1280px] items-center gap-2 sm:gap-4 px-2 sm:px-6">
          {/* Logo & Travel Tab Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Logo variant="light" />

            {/* Top Offers Pill */}
            <Link
              to="/products?featured=true"
              className="hidden md:flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <IconTag size={13} />
              <span>Top Offers</span>
            </Link>
          </div>

          {/* Location Delivery Selector */}
          <button
            type="button"
            onClick={promptLocation}
            className="hidden xl:flex items-center gap-1.5 text-xs text-white/90 transition-colors hover:text-white shrink-0"
            title="Set delivery address"
          >
            <IconMapPin size={15} className="text-yellow-300" />
            <div className="text-left leading-tight">
              <span className="block text-[10px] text-white/70">Location not set</span>
              <span className="font-semibold underline underline-offset-2">{locationText} &rsaquo;</span>
            </div>
          </button>

          {/* Search Bar */}
          <SearchBar className="min-w-0 flex-1" />

          {/* Right Desktop Nav Links */}
          <nav className="ml-auto hidden items-center gap-5 lg:flex" aria-label="Main navigation">
            {/* Login / User Dropdown */}
            <div className="relative" ref={loginRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setLoginDropdownOpen((open) => !open)}
                  className="flex items-center gap-1.5 rounded bg-white px-4 py-1.5 text-sm font-bold text-accent-500 shadow-sm transition-colors hover:bg-yellow-300 hover:text-ink-900"
                >
                  <span>{user.name.split(" ")[0]}</span>
                  <IconChevron size={14} />
                </button>
              ) : (
                <Link
                  to="/login"
                  onMouseEnter={() => setLoginDropdownOpen(true)}
                  className="flex items-center gap-1.5 rounded bg-white px-6 py-1.5 text-sm font-bold text-accent-500 shadow-sm transition-colors hover:bg-yellow-300 hover:text-ink-900"
                >
                  Login
                  <IconChevron size={14} />
                </Link>
              )}

              {/* Login Dropdown Menu */}
              {loginDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 animate-scale-in rounded-md border border-ink-100 bg-white p-1.5 shadow-deep z-50 text-ink-800"
                  onClick={() => setLoginDropdownOpen(false)}
                >
                  {!user && (
                    <div className="flex items-center justify-between border-b border-ink-100 px-3 py-2 text-xs font-semibold">
                      <span>New Customer?</span>
                      <Link to="/register" className="font-bold text-accent-500 hover:underline">
                        Sign Up
                      </Link>
                    </div>
                  )}
                  {user && (
                    <div className="border-b border-ink-100 px-3 py-2 text-xs font-bold text-ink-900">
                      Hello, {user.name}
                    </div>
                  )}
                  <Link
                    to={user ? "/profile" : "/login"}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-ink-50 hover:text-accent-500"
                  >
                    <IconUser size={16} /> My Profile
                  </Link>
                  <Link
                    to={user ? "/orders" : "/login"}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-ink-50 hover:text-accent-500"
                  >
                    <IconBox size={16} /> Orders
                  </Link>
                  <Link
                    to={user ? "/wishlist" : "/login"}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-ink-50 hover:text-accent-500"
                  >
                    <span className="flex items-center gap-2.5">
                      <IconHeart size={16} /> Wishlist
                    </span>
                    {wishlist.length > 0 && (
                      <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {wishlist.length}
                      </span>
                    )}
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-semibold text-accent-500 hover:bg-accent-50"
                    >
                      <IconGrid size={16} /> Seller Hub
                    </Link>
                  )}
                  {user && (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium text-danger hover:bg-red-50"
                    >
                      <IconLogout size={16} /> Logout
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Cart Link */}
            <Link
              to="/cart"
              className="flex items-center gap-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <div className="relative">
                <IconCart size={20} />
                {cart.count > 0 && (
                  // Keyed on the count so React remounts the badge and replays
                  // the pop whenever the number changes — it used to update in
                  // total silence, which is half of why an add felt like
                  // nothing had happened.
                  <span
                    key={cart.count}
                    className="absolute -right-2 -top-2 grid h-4 w-4 animate-scale-in place-items-center rounded-full bg-yellow-400 text-[10px] font-bold text-ink-900"
                  >
                    {cart.count}
                  </span>
                )}
              </div>
              <span>Cart</span>
            </Link>

            {/* Become a Seller / More Menu */}
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreDropdownOpen((open) => !open)}
                className="flex items-center gap-1 text-sm font-semibold text-white hover:opacity-90"
              >
                <span>More</span>
                <IconChevron size={14} />
              </button>

              {moreDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 animate-scale-in rounded-md border border-ink-100 bg-white p-1.5 shadow-deep z-50 text-ink-800"
                  onClick={() => setMoreDropdownOpen(false)}
                >
                  <Link
                    to="/products"
                    className="block rounded-md px-3 py-2 text-sm hover:bg-ink-50 hover:text-accent-500"
                  >
                    All Products
                  </Link>
                  <Link
                    to="/page/about"
                    className="block rounded-md px-3 py-2 text-sm hover:bg-ink-50 hover:text-accent-500"
                  >
                    About NexaMart
                  </Link>
                  <Link
                    to="/page/contact"
                    className="block rounded-md px-3 py-2 text-sm hover:bg-ink-50 hover:text-accent-500"
                  >
                    24x7 Customer Care
                  </Link>
                  <Link
                    to="/page/sell"
                    className="block rounded-md px-3 py-2 text-sm font-semibold text-accent-500 hover:bg-accent-50"
                  >
                    Become a Seller
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            className="ml-auto grid h-10 w-10 place-items-center rounded-lg text-white transition-colors hover:bg-white/15 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-[64px] z-40 overflow-y-auto bg-white px-5 py-5 transition-all lg:hidden">
          <div className="flex flex-col divide-y divide-ink-100">
            <button
              type="button"
              onClick={promptLocation}
              className="flex items-center gap-2 py-3 text-sm font-semibold text-accent-500"
            >
              <IconMapPin size={16} />
              <span>{locationText}</span>
            </button>
            <Link to="/" className="flex items-center gap-3 py-3 font-semibold text-ink-900" onClick={() => setMenuOpen(false)}>
              <IconStar size={17} /> Home
            </Link>
            <Link to="/products" className="flex items-center gap-3 py-3 font-semibold text-ink-900" onClick={() => setMenuOpen(false)}>
              <IconBox size={17} /> All Products
            </Link>
            <Link to="/cart" className="flex items-center justify-between py-3 font-semibold text-ink-900" onClick={() => setMenuOpen(false)}>
              <span className="flex items-center gap-3">
                <IconCart size={17} /> Cart
              </span>
              {cart.count > 0 && (
                <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-ink-900">
                  {cart.count}
                </span>
              )}
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-3 py-3 text-ink-700" onClick={() => setMenuOpen(false)}>
                  <IconUser size={17} /> My Profile
                </Link>
                <Link to="/orders" className="flex items-center gap-3 py-3 text-ink-700" onClick={() => setMenuOpen(false)}>
                  <IconBox size={17} /> My Orders
                </Link>
                <Link to="/wishlist" className="flex items-center gap-3 py-3 text-ink-700" onClick={() => setMenuOpen(false)}>
                  <IconHeart size={17} /> Wishlist ({wishlist.length})
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="flex items-center gap-3 py-3 font-bold text-accent-500" onClick={() => setMenuOpen(false)}>
                    <IconGrid size={17} /> Seller Hub
                  </Link>
                )}
                <button type="button" className="flex items-center gap-3 py-3 text-left font-semibold text-danger" onClick={handleLogout}>
                  <IconLogout size={17} /> Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn mt-4" onClick={() => setMenuOpen(false)}>
                Sign in to NexaMart
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
