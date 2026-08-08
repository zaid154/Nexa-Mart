import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Rating from "../components/Rating.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { formatINR } from "../utils/format.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage.js";

// Page that shows the products the user has saved to their wishlist.
const Wishlist = () => {
  const { wishlist, loading, removeFromWishlist, addToCart } = useCart();
  const toast = useToast();

  if (loading) {
    return (
      <div className="bg-white shadow-card">
        <div className="skeleton m-5 h-6 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-ink-100 px-5 py-5">
            <div className="skeleton h-24 w-24 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-5 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <EmptyState
        eyebrow="Saved items"
        title="Your wishlist is empty"
        message="Save products you love and come back to them anytime."
        icon="wishlist"
        action={<Link to="/products" className="btn">Discover products</Link>}
      />
    );
  }

  const remove = async (productId) => {
    try {
      await removeFromWishlist(productId);
      toast.info("Removed from wishlist");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const moveToCart = async (productId) => {
    try {
      await addToCart(productId, 1);
      await removeFromWishlist(productId);
      toast.success("Moved to cart");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="animate-fade-in bg-white shadow-card">
      <h1 className="border-b border-ink-100 px-5 py-3.5 text-base font-medium text-ink-900">
        My Wishlist ({wishlist.length})
      </h1>

      <div className="divide-y divide-ink-100">
        {wishlist.map((product) => {
          const discount =
            product.mrp > product.price
              ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
              : 0;
          const outOfStock = product.countInStock === 0;

          return (
            <div key={product._id} className="flex gap-4 px-5 py-5">
              <Link to={`/products/${product._id}`} className="shrink-0">
                <img
                  src={product.media?.[0]?.url || product.images?.[0] || PRODUCT_IMAGE_PLACEHOLDER}
                  alt={product.name}
                  width="96"
                  height="96"
                  className="h-24 w-24 bg-white object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={onProductImageError}
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link to={`/products/${product._id}`}>
                  <h3 className="line-clamp-2 text-[15px] text-ink-900 hover:text-accent-500">
                    {product.name}
                  </h3>
                </Link>
                <p className="mt-1 text-xs text-ink-400">{product.brand}</p>
                <div className="mt-1.5">
                  <Rating value={product.rating} count={product.numReviews} />
                </div>
                <div className="price-row mt-2">
                  <span className="text-lg font-medium text-ink-900">
                    {formatINR(product.price)}
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="price-mrp">{formatINR(product.mrp)}</span>
                      <span className="price-off">{discount}% off</span>
                    </>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-6">
                  <button
                    type="button"
                    className="text-sm font-bold uppercase tracking-wide text-accent-500 transition-colors hover:text-accent-600 disabled:opacity-40"
                    onClick={() => moveToCart(product._id)}
                    disabled={outOfStock}
                  >
                    {outOfStock ? "Out of stock" : "Move to cart"}
                  </button>
                  <button
                    type="button"
                    className="text-sm font-bold uppercase tracking-wide text-ink-700 transition-colors hover:text-danger"
                    onClick={() => remove(product._id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
