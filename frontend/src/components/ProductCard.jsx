import { Link, useNavigate } from "react-router-dom";
import Rating from "./Rating.jsx";
import { formatINR } from "../utils/format.js";
import { onProductImageError } from "../utils/productImage.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { IconHeart } from "./Icons.jsx";

// One product box shown in the product grid.
const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { addToCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  // Is this product already in the wishlist?
  const isWished = inWishlist(product._id);

  // The first image of the product, if it has any.
  let image = null;
  if (product.images && product.images.length > 0) {
    image = product.images[0];
  }

  // Work out the discount percentage (0 if there is no discount).
  let discount = 0;
  if (product.mrp > product.price) {
    discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  }

  // Add or remove the product from the wishlist.
  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      if (isWished) {
        await removeFromWishlist(product._id);
        toast.info("Removed from wishlist");
      } else {
        await addToWishlist(product._id);
        toast.success("Added to wishlist");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Add the product to the cart.
  const handleAdd = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(product._id, 1);
      toast.success("Added to cart");
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Text and disabled state for the add to cart button.
  const outOfStock = product.countInStock === 0;
  let addButtonText = "Add to cart";
  if (outOfStock) {
    addButtonText = "Out of stock";
  }

  // Title shown when hovering the wishlist button.
  let wishlistTitle = "Add to wishlist";
  if (isWished) {
    wishlistTitle = "Remove from wishlist";
  }

  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-thumb">
        {discount > 0 && <span className="discount-badge">-{discount}%</span>}
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={onProductImageError}
          />
        ) : null}
        <button
          type="button"
          className={`wishlist-btn ${isWished ? "active" : ""}`}
          onClick={handleWishlist}
          title={wishlistTitle}
          aria-label={wishlistTitle}
        >
          <IconHeart size={16} filled={isWished} />
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
          disabled={outOfStock}
        >
          {addButtonText}
        </button>
      </div>
    </Link>
  );
};

export default ProductCard;
