import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import SearchBar from "./SearchBar.jsx";
import api from "../api/client.js";
import {
  IconHeart,
  IconCart,
  IconUser,
  IconMenu,
  IconClose,
  IconChevron,
  BrandMark,
} from "./Icons.jsx";

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { cart, wishlist } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const catRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    api.get("/products/filters").then((res) => setCategories(res.data.categories || []));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    setProfileOpen(false);
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <>
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="navbar-inner">
          <Link to="/" className="brand" aria-label="NexaMart home">
            <BrandMark size={36} />
            Nexa<span>Mart</span>
          </Link>

          <div className="nav-categories" ref={catRef}>
            <button
              type="button"
              className={`nav-categories-btn ${catOpen ? "open" : ""}`}
              onClick={() => setCatOpen((o) => !o)}
              aria-expanded={catOpen}
              aria-haspopup="true"
            >
              Categories <IconChevron />
            </button>
            {catOpen && (
              <div className="nav-categories-menu" role="menu">
                <Link to="/products" role="menuitem" onClick={() => setCatOpen(false)}>
                  All Products
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c}
                    to={`/products?category=${encodeURIComponent(c)}`}
                    role="menuitem"
                    onClick={() => setCatOpen(false)}
                  >
                    {c}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <SearchBar categories={categories} className="nav-search-desktop" />
                {/* <h1 className="text-red-500">Hello World zaid</h1> */}

          <nav className="nav-links nav-links-desktop" aria-label="Main navigation">
            <Link to="/products" className="nav-link">Shop</Link>

            {user && (
              <Link to="/wishlist" className="nav-icon-btn" aria-label={`Wishlist, ${wishlist.length} items`}>
                <IconHeart size={20} filled={wishlist.length > 0} />
                {wishlist.length > 0 && <span className="nav-icon-badge">{wishlist.length}</span>}
              </Link>
            )}

            <Link to="/cart" className="nav-icon-btn" aria-label={`Cart, ${cart.count} items`}>
              <IconCart size={20} />
              {cart.count > 0 && <span className="nav-icon-badge">{cart.count}</span>}
            </Link>

            {user ? (
              <div className="menu" ref={profileRef}>
                <button
                  type="button"
                  className="nav-icon-btn"
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={profileOpen}
                >
                  <IconUser size={20} />
                </button>
                {profileOpen && (
                  <div className="menu-dropdown" onClick={() => setProfileOpen(false)}>
                    <span className="muted font-sm menu-user-name">
                      {user.name}
                    </span>
                    <Link to="/profile">Profile</Link>
                    <Link to="/orders">My Orders</Link>
                    {isAdmin && <Link to="/admin">Admin Panel</Link>}
                    <button type="button" onClick={handleLogout}>Logout</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-sm">Sign in</Link>
            )}
          </nav>

          <button
            type="button"
            className="nav-mobile-toggle"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <SearchBar
          categories={categories}
          className="search-bar-mobile"
          onNavigate={() => setMenuOpen(false)}
        />
        <div className="mobile-menu-links">
          <Link to="/products" onClick={() => setMenuOpen(false)}>Shop All</Link>
          {categories.map((c) => (
            <Link
            key={c}
            to={`/products?category=${encodeURIComponent(c)}`}
            onClick={() => setMenuOpen(false)}
            >
              {c}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist ({wishlist.length})</Link>
              <Link to="/cart" onClick={() => setMenuOpen(false)}>Cart ({cart.count})</Link>
              <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
              <Link to="/orders" onClick={() => setMenuOpen(false)}>My Orders</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
              <button type="button" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="btn" onClick={() => setMenuOpen(false)}>Sign in</Link>
          )}
        </div>
      </div>
    </>
  );
}
