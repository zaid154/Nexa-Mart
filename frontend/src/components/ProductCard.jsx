import { Link, useNavigate } from "react-router-dom";
import Rating from "./Rating.jsx";
import { formatINR } from "../utils/format.js";
import { onProductImageError } from "../utils/productImage.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { IconHeart } from "./Icons.jsx";

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const { addToCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const wished = inWishlist(product._id);
  const img = product.images?.[0];
  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate("/login");
    try {
      if (wished) {
        await removeFromWishlist(product._id);
        toast.info("Removed from wishlist");
      } else {
        await addToWishlist(product._id);
        toast.success("Added to wishlist");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate("/login");
    try {
      await addToCart(product._id, 1);
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-thumb">
        {discount > 0 && <span className="discount-badge">-{discount}%</span>}
        {img ? (
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            onError={onProductImageError}
          />
        ) : null}
        <button
          type="button"
          className={`wishlist-btn ${wished ? "active" : ""}`}
          onClick={handleWishlist}
          title={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <IconHeart size={16} filled={wished} />
        </button>
      </div>
      <div className="product-body">
        <span className="product-brand">{product.brand}</span>
        <span className="product-name">{product.name}</span>
        <Rating value={product.rating} count={product.numReviews} />
        <div className="product-price">
          {formatINR(product.price)}
          {product.mrp > product.price && (
            <>
              <span className="product-mrp">{formatINR(product.mrp)}</span>
              <span className="product-discount-pct">-{discount}%</span>
            </>
          )}
        </div>
        <button
          type="button"
          className="btn product-add-btn"
          onClick={handleAdd}
          disabled={product.countInStock === 0}
        >
          {product.countInStock === 0 ? "Out of stock" : "Add to cart"}
        </button>
      </div>
    </Link>
  );
}
