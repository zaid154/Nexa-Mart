import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client.js";
import ErrorState from "../components/ErrorState.jsx";
import { SkeletonDetail } from "../components/Skeleton.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Rating from "../components/Rating.jsx";
import { formatINR, formatDate } from "../utils/format.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { IconHeart } from "../components/Icons.jsx";
import { onProductImageError } from "../utils/productImage.js";

// Single product page with images, variants, reviews, and related products.
const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [activeTab, setActiveTab] = useState("description");
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  // Load the product, its reviews, and a few related products.
  const load = () => {
    setLoading(true);
    setError("");
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data.product);
        setReviews(res.data.reviews);

        if (res.data.product?.category) {
          api
            .get("/products", {
              params: { category: res.data.product.category, limit: 4 },
            })
            .then((r) => {
              // Remove the current product, then keep up to 4 related ones.
              const others = r.data.products.filter((p) => p._id !== res.data.product._id);
              setRelated(others.slice(0, 4));
            });
        }
      })
      .catch((err) => {
        setError(err.message);
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    setActiveImg(0);
    setQty(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <SkeletonDetail />;
  }
  if (error) {
    return <ErrorState title="Failed to load product" message={error} onRetry={load} />;
  }
  if (!product) {
    return (
      <div className="empty-state card">
        <span className="eyebrow">Product</span>
        <p className="empty-state-title">Not found</p>
        <p className="muted">This product could not be found.</p>
        <Link to="/products" className="btn">Browse products</Link>
      </div>
    );
  }

  const wished = inWishlist(product._id);
  const specs = product.specs || {};
  const variants = product.variants || [];
  const activeVariant = variants[selectedVariant];

  // Use the selected variant's price/stock if there is one, else the product's.
  let displayPrice = product.price;
  let displayStock = product.countInStock;
  if (activeVariant) {
    if (activeVariant.price !== undefined && activeVariant.price !== null) {
      displayPrice = activeVariant.price;
    }
    if (activeVariant.countInStock !== undefined && activeVariant.countInStock !== null) {
      displayStock = activeVariant.countInStock;
    }
  }

  // Work out the discount percentage if the MRP is higher than the price.
  let discount = 0;
  if (product.mrp > displayPrice) {
    discount = Math.round(((product.mrp - displayPrice) / product.mrp) * 100);
  }

  // Add the product to the cart (after making sure the user is signed in).
  const handleAdd = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(product._id, qty);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Add to cart and go straight to checkout.
  const handleBuyNow = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(product._id, qty);
      navigate("/checkout");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Add or remove the product from the wishlist.
  const handleWishlist = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      if (wished) {
        await removeFromWishlist(product._id);
        toast.success("Removed from wishlist");
      } else {
        await addToWishlist(product._id);
        toast.success("Added to wishlist");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Send a new review to the server.
  const submitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post(`/reviews/product/${product._id}`, form);
      toast.success("Review submitted");
      setForm({ rating: 5, comment: "" });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Decrease the quantity, but never below 1.
  const decreaseQty = () => {
    setQty((q) => Math.max(1, q - 1));
  };

  // Increase the quantity, but never above the available stock.
  const increaseQty = () => {
    setQty((q) => Math.min(displayStock, q + 1));
  };

  return (
    <div className="animate-fade-in">
      <button type="button" className="page-back btn-ghost btn-sm" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="detail">
        <div>
          <div className="gallery-main gallery-zoom">
            {product.images?.[activeImg] && (
              <img
                src={product.images[activeImg]}
                alt={product.name}
                onError={onProductImageError}
              />
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="gallery-thumbs">
              {product.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className={i === activeImg ? "active" : ""}
                  onClick={() => setActiveImg(i)}
                  onError={onProductImageError}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setActiveImg(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="detail-info">
          <span className="product-brand">{product.brand}</span>
          <h1>{product.name}</h1>
          <Rating value={product.rating} count={product.numReviews} />

          <div className="price-lg detail-price">
            {formatINR(displayPrice)}
            {product.mrp > displayPrice && (
              <>
                <span className="product-mrp">{formatINR(product.mrp)}</span>
                <span className="product-discount-pct">-{discount}%</span>
              </>
            )}
          </div>

          {variants.length > 0 && (
            <div className="field mt-3">
              <label>Options</label>
              <div className="row wrap gap-2">
                {variants.map((v, i) => {
                  // Build a readable label from the variant attributes.
                  let label = Object.values(v.attributes || {}).join(" / ");
                  if (!label) {
                    label = `Option ${i + 1}`;
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`chip ${selectedVariant === i ? "active" : ""}`}
                      onClick={() => {
                        setSelectedVariant(i);
                        setQty(1);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p>
            {displayStock > 0 ? (
              <span className="badge badge-success">In stock ({displayStock} available)</span>
            ) : (
              <span className="badge badge-danger">Out of stock</span>
            )}
          </p>

          <div className="row detail-actions">
            <div className="qty">
              <button type="button" onClick={decreaseQty} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button type="button" onClick={increaseQty} aria-label="Increase quantity">+</button>
            </div>
            <button type="button" className="btn" onClick={handleAdd} disabled={displayStock === 0}>
              Add to cart
            </button>
            <button type="button" className="btn btn-outline" onClick={handleBuyNow} disabled={displayStock === 0}>
              Buy now
            </button>
            <button
              type="button"
              className={`btn btn-outline ${wished ? "active" : ""}`}
              onClick={handleWishlist}
              aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            >
              <IconHeart size={16} filled={wished} />
              {wished ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="detail-tabs" role="tablist">
        {["description", "specifications", "reviews"].map((tab) => {
          // Capitalize the first letter for the tab label.
          const tabLabel = tab.charAt(0).toUpperCase() + tab.slice(1);
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              className={`detail-tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
              aria-selected={activeTab === tab}
            >
              {tabLabel}
              {tab === "reviews" && ` (${reviews.length})`}
            </button>
          );
        })}
      </div>

      {activeTab === "description" && (
        <section className="section-block card">
          <p className="detail-desc">{product.description}</p>
        </section>
      )}

      {activeTab === "specifications" && Object.keys(specs).length > 0 && (
        <section className="section-block card">
          <table className="spec-table">
            <tbody>
              {Object.entries(specs).map(([key, value]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === "reviews" && (
        <section className="section-block">
          {user && (
            <form className="card form review-form mb-4" onSubmit={submitReview}>
              <h3>Write a review</h3>
              <p className="muted review-note">You can review products you've purchased.</p>
              <div className="field">
                <label>Rating</label>
                <select
                  className="select"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} star{r > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Comment</label>
                <textarea
                  className="textarea"
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="Share your experience..."
                  required
                />
              </div>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit review"}
              </button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="muted">No reviews yet. Be the first to review!</p>
          ) : (
            <div className="review-list">
              {reviews.map((r) => (
                <div key={r._id} className="card">
                  <div className="row-between">
                    <strong>{r.name}</strong>
                    <span className="muted font-sm">{formatDate(r.createdAt)}</span>
                  </div>
                  <Rating value={r.rating} showCount={false} />
                  <p className="mb-0">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {related.length > 0 && (
        <section className="collection-section">
          <div className="section-head">
            <h2 className="section-title-lg">Related products</h2>
            <Link
              to={`/products?category=${encodeURIComponent(product.category)}`}
              className="section-link"
            >
              View all
            </Link>
          </div>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
