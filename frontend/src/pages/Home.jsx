import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { SkeletonHome } from "../components/Skeleton.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { IconShield, IconTruck, IconRefresh, IconStar } from "../components/Icons.jsx";

// An emoji icon for each category name.
const CATEGORY_ICONS = {
  Smartphones: "📱",
  Laptops: "💻",
  Headphones: "🎧",
  "Smart Watches": "⌚",
  Tablets: "📲",
  Accessories: "🔌",
  "Gaming Devices": "🎮",
  Cameras: "📷",
};

const BRANDS = ["Apple", "Samsung", "Dell", "HP", "Lenovo", "ASUS", "Sony", "Bose"];

// Extra product sections shown lower on the home page.
const COLLECTIONS = [
  { title: "Gaming Zone", query: "Gaming Devices", sort: "rating" },
  { title: "Smartphones", query: "Smartphones", sort: "newest" },
  { title: "Laptops", query: "Laptops", sort: "price_desc" },
  { title: "Best Deals", query: "", featured: true },
];

// The store home page with hero, categories, and product collections.
const Home = () => {
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  // Load the main product lists shown at the top of the page.
  const loadHome = () => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/products", { params: { featured: true, limit: 4 } }),
      api.get("/products", { params: { sort: "newest", limit: 8 } }),
      api.get("/products", { params: { sort: "rating", limit: 4 } }),
      api.get("/products/filters"),
    ])
      .then((responses) => {
        const featuredRes = responses[0];
        const latestRes = responses[1];
        const topRatedRes = responses[2];
        const filtersRes = responses[3];

        setFeatured(featuredRes.data?.products || []);
        setLatest(latestRes.data?.products || []);
        setTopRated(topRatedRes.data?.products || []);
        setCategories(filtersRes.data?.categories || []);
      })
      .catch((err) => setError(err.message || "Failed to load products"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHome();
  }, []);

  // Load each extra collection section one by one.
  useEffect(() => {
    COLLECTIONS.forEach((col) => {
      const params = { limit: 4, sort: col.sort };
      if (col.featured) {
        params.featured = true;
      } else if (col.query) {
        params.category = col.query;
      }

      api
        .get("/products", { params })
        .then((res) => {
          setCollections((prev) => ({
            ...prev,
            [col.title]: res.data?.products || [],
          }));
        })
        .catch(() => {
          setCollections((prev) => ({ ...prev, [col.title]: [] }));
        });
    });
  }, []);

  // Newsletter form just clears the email box for now.
  const handleNewsletter = (e) => {
    e.preventDefault();
    setEmail("");
  };

  // Build the "View all" link for a collection section.
  const collectionLink = (col) => {
    if (col.featured) {
      return "/products?featured=true";
    }
    return `/products?category=${encodeURIComponent(col.query)}`;
  };

  if (loading) {
    return <SkeletonHome />;
  }

  return (
    <div className="animate-fade-in">
      {error && (
        <ErrorState
          title="Could not load store data"
          message={error}
          onRetry={loadHome}
        />
      )}

      <section className="hero-dark bleed-full">
        <div className="hero-content animate-slide-up">
          <span className="hero-badge">New season tech</span>
          <h1>Premium electronics, delivered fast.</h1>
          <p>
            Shop the latest smartphones, laptops, audio gear and cameras from brands you
            trust — at prices you'll love.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn">Browse all products</Link>
            <Link to="/products?featured=true" className="btn btn-outline">View deals</Link>
          </div>
        </div>
      </section>

      <div className="trust-strip">
        <div className="trust-item">
          <IconTruck size={28} />
          <div>
            <strong>Free Shipping</strong>
            <span>On orders over ₹5,000</span>
          </div>
        </div>
        <div className="trust-item">
          <IconShield size={28} />
          <div>
            <strong>Secure Payments</strong>
            <span>256-bit SSL encryption</span>
          </div>
        </div>
        <div className="trust-item">
          <IconRefresh size={28} />
          <div>
            <strong>Easy Returns</strong>
            <span>30-day hassle-free</span>
          </div>
        </div>
        <div className="trust-item">
          <IconStar size={28} />
          <div>
            <strong>Warranty Support</strong>
            <span>Genuine manufacturer warranty</span>
          </div>
        </div>
      </div>

      {categories.length > 0 && (
        <section className="collection-section">
          <div className="section-head">
            <h2 className="section-title-lg">Shop by category</h2>
            <Link to="/products" className="section-link">View all</Link>
          </div>
          <div className="category-grid">
            {categories.map((c) => (
              <Link
                key={c}
                to={`/products?category=${encodeURIComponent(c)}`}
                className="category-card"
              >
                <span className="category-card-icon" aria-hidden="true">
                  {CATEGORY_ICONS[c] || "📦"}
                </span>
                <span>{c}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="promo-banner section">
        <div>
          <span className="eyebrow">Limited offer</span>
          <h3>15% Off Sitewide</h3>
          <p>Use code at checkout on orders above ₹2,000</p>
        </div>
        <span className="promo-code">NEXA15</span>
      </section>

      {featured.length > 0 && (
        <section className="collection-section">
          <div className="section-head">
            <h2 className="section-title-lg">Best sellers</h2>
            <Link to="/products?featured=true" className="section-link">View all</Link>
          </div>
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="collection-section">
        <div className="section-head">
          <h2 className="section-title-lg">New arrivals</h2>
          <Link to="/products?sort=newest" className="section-link">View all</Link>
        </div>
        <div className="product-slider">
          {latest.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      </section>

      {topRated.length > 0 && (
        <section className="collection-section">
          <div className="section-head">
            <h2 className="section-title-lg">Top rated</h2>
            <Link to="/products?sort=rating" className="section-link">View all</Link>
          </div>
          <div className="product-grid">
            {topRated.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section className="collection-section">
        <div className="section-head">
          <h2 className="section-title-lg">Shop by brand</h2>
        </div>
        <div className="brand-grid">
          {BRANDS.map((b) => (
            <Link
              key={b}
              to={`/products?brand=${encodeURIComponent(b)}`}
              className="brand-card"
            >
              {b}
            </Link>
          ))}
        </div>
      </section>

      {COLLECTIONS.map((col) => {
        const products = collections[col.title] || [];
        if (products.length === 0) {
          return null;
        }
        return (
          <section key={col.title} className="collection-section">
            <div className="section-head">
              <h2 className="section-title-lg">{col.title}</h2>
              <Link to={collectionLink(col)} className="section-link">
                View all
              </Link>
            </div>
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        );
      })}

      <section className="benefits-grid">
        <div className="benefit-card">
          <IconShield size={32} />
          <strong>Secure Payments</strong>
          <span>Razorpay &amp; COD</span>
        </div>
        <div className="benefit-card">
          <IconStar size={32} />
          <strong>Genuine Products</strong>
          <span>100% authentic</span>
        </div>
        <div className="benefit-card">
          <IconTruck size={32} />
          <strong>Fast Delivery</strong>
          <span>2-5 business days</span>
        </div>
        <div className="benefit-card">
          <IconRefresh size={32} />
          <strong>Easy Returns</strong>
          <span>30-day policy</span>
        </div>
        <div className="benefit-card">
          <IconStar size={32} />
          <strong>Warranty Support</strong>
          <span>Full coverage</span>
        </div>
      </section>

      <section className="newsletter section">
        <h3>Stay in the loop</h3>
        <p>Get early access to new arrivals, deals, and exclusive offers.</p>
        <form className="newsletter-form" onSubmit={handleNewsletter}>
          <input
            type="email"
            className="input"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Newsletter email"
          />
          <button type="submit" className="btn">Subscribe</button>
        </form>
      </section>
    </div>
  );
};

export default Home;
