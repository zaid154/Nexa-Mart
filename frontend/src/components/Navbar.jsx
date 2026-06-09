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

// The top navigation bar shown on every page.
const Navbar = () => {
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

  // Load the list of categories from the server.
  useEffect(() => {
    api.get("/products/filters").then((res) => {
      setCategories(res.data.categories || []);
    });
  }, []);

  // Add a shadow to the navbar once the page is scrolled a little.
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the dropdowns when the user clicks outside of them.
  useEffect(() => {
    const handleClick = (event) => {
      if (catRef.current && !catRef.current.contains(event.target)) {
        setCatOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Stop the page from scrolling while the mobile menu is open.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Log out and go back to the home page.
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
              onClick={() => setCatOpen((open) => !open)}
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
                {categories.map((category) => (
                  <Link
                    key={category}
                    to={`/products?category=${encodeURIComponent(category)}`}
                    role="menuitem"
                    onClick={() => setCatOpen(false)}
                  >
                    {category}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <SearchBar categories={categories} className="nav-search-desktop" />

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
                  onClick={() => setProfileOpen((open) => !open)}
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
            onClick={() => setMenuOpen((open) => !open)}
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
          {categories.map((category) => (
            <Link
              key={category}
              to={`/products?category=${encodeURIComponent(category)}`}
              onClick={() => setMenuOpen(false)}
            >
              {category}
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
};

export default Navbar;
