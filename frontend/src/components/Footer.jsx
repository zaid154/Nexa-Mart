import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext.jsx";
import api from "../api/client.js";

// The social media links we can show. "short" is the small label on the button.
const socialLinks = [
  { key: "instagram", label: "Instagram", short: "IG" },
  { key: "twitter", label: "Twitter / X", short: "X" },
  { key: "facebook", label: "Facebook", short: "FB" },
  { key: "youtube", label: "YouTube", short: "YT" },
  { key: "linkedin", label: "LinkedIn", short: "IN" },
  { key: "whatsapp", label: "WhatsApp", short: "WA" },
];

const Footer = () => {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [social, setSocial] = useState({});

  // Load the social media links saved by the admin.
  useEffect(() => {
    api
      .get("/admin/settings/public")
      .then((res) => {
        setSocial(res.data.social || {});
      })
      .catch(() => {});
  }, []);

  // Handle the newsletter sign up form.
  const handleNewsletter = (event) => {
    event.preventDefault();
    if (!email) {
      return;
    }
    toast.success("Thanks for subscribing!");
    setEmail("");
  };

  // Only show social buttons that the admin has actually set a link for.
  const activeSocial = socialLinks.filter((item) => social[item.key]);

  // The year shown in the copyright line.
  const currentYear = new Date().getFullYear();

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
                onChange={(event) => setEmail(event.target.value)}
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
              {activeSocial.map((item) => (
                <a
                  key={item.key}
                  href={social[item.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.label}
                >
                  {item.short}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>&copy; {currentYear} NexaMart. All rights reserved.</span>
          <div className="row gap-3">
            <Link to="/products">Terms</Link>
            <Link to="/products">Privacy</Link>
            <span>support@nexamart.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
