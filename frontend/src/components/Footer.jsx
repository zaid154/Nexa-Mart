import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";

export default function Footer() {
  const toast = useToast();
  const [email, setEmail] = useState("");

  const handleNewsletter = (e) => {
    e.preventDefault();
    if (!email) return;
    toast.success("Thanks for subscribing!");
    setEmail("");
  };

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              Nexa<span>Mart</span>
            </div>
            <p className="footer-desc">
              Your destination for premium electronics. Genuine products, secure payments,
              and fast delivery across India.
            </p>
            <form className="footer-newsletter" onSubmit={handleNewsletter}>
              <input
                type="email"
                className="input"
                placeholder="Email for deals"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Newsletter email"
              />
              <button type="submit" className="btn btn-sm">Subscribe</button>
            </form>
          </div>

          <div className="footer-col">
            <h4>Shop</h4>
            <Link to="/products">All Products</Link>
            <Link to="/products?featured=true">Best Sellers</Link>
            <Link to="/products?sort=newest">New Arrivals</Link>
            <Link to="/products?sort=rating">Top Rated</Link>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/products">About Us</Link>
            <Link to="/products">Careers</Link>
            <Link to="/products">Press</Link>
            <Link to="/products">Blog</Link>
          </div>

          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/products">Help Center</Link>
            <Link to="/orders">Track Order</Link>
            <Link to="/products">Returns</Link>
            <Link to="/products">Warranty</Link>
          </div>

          <div className="footer-col">
            <h4>Policies</h4>
            <Link to="/products">Terms of Service</Link>
            <Link to="/products">Privacy Policy</Link>
            <Link to="/products">Shipping Policy</Link>
            <Link to="/products">Contact Us</Link>
          </div>

          <div className="footer-col">
            <h4>Follow us</h4>
            <div className="footer-social">
              <a href="#" aria-label="Instagram">IG</a>
              <a href="#" aria-label="Twitter">X</a>
              <a href="#" aria-label="Facebook">FB</a>
              <a href="#" aria-label="YouTube">YT</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} NexaMart. All rights reserved.</span>
          <div className="row gap-3">
            <Link to="/products">Terms</Link>
            <Link to="/products">Privacy</Link>
            <span>support@nexamart.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
