import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/apiClient.js";
import ProductCard from "./productCard.jsx";
import { formatINR, formatDate } from "../utils/formatUtils.js";
import { useCart } from "../context/cartContext.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImageUtils.js";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const {
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    addToWishlist,
    removeFromWishlist,
    inWishlist,
  } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [updatingCartQty, setUpdatingCartQty] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedSwatchIndex, setSelectedSwatchIndex] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Fetch product data, reviews, and recommendations
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api
      .get(`/products/${id}`)
      .then((res) => {
        if (!isMounted) return;
        const prod = res.data?.product || res.data;
        setProduct(prod);
        setSelectedImage(prod?.images?.[0] || prod?.image || "");
        setReviews(res.data?.reviews || []);

        if (prod?.category) {
          api
            .get("/products", { params: { category: prod.category, limit: 5 } })
            .then((relRes) => {
              if (!isMounted) return;
              const others = (relRes.data?.products || []).filter((p) => p._id !== prod._id);
              setRelated(others.slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        if (isMounted) toast.error(err.message || "Failed to load product");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#2874f0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">The product you are looking for does not exist.</p>
        <Link
          to="/products"
          className="mt-4 inline-block px-5 py-2.5 bg-[#2874f0] text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const price = product.price ?? 0;
  const mrp = product.mrp && product.mrp > price ? product.mrp : Math.round(price * 1.35);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const inStock = (product.countInStock ?? 0) > 0;
  const maxStock = product.countInStock ?? 99;
  const isWished = inWishlist(product._id);

  // Check if product is in cart
  const cartItem = (cart?.items || []).find((item) => {
    return String(item.product?._id || item.product?.id || item.product) === String(product._id);
  });

  const isInCart = Boolean(cartItem);
  const currentCartQty = cartItem ? cartItem.quantity : 0;

  const images = [
    ...(product.images || []),
    ...(product.image ? [product.image] : []),
  ].filter((img, i, arr) => img && arr.indexOf(img) === i);

  // Color swatches mapped from product attributes and images
  const baseColor = product.attributes?.Color || "Standard";
  const colorNames = [baseColor, "Graphite", "Silver", "Rose Gold", "Midnight Blue"];
  const colorSwatches = (images.length > 0 ? images : [PRODUCT_IMAGE_PLACEHOLDER]).map((img, idx) => ({
    name: colorNames[idx % colorNames.length],
    image: img,
  }));

  const activeColor = colorSwatches[selectedSwatchIndex]?.name || baseColor;

  // Monthly EMI estimation
  const emiAmount = Math.max(199, Math.round(price / 3));

  // Dual images for the side-by-side showcase
  const primaryDisplayImage = selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER;
  const secondaryDisplayImage = images[1] || images[0] || PRODUCT_IMAGE_PLACEHOLDER;

  // Quantity helpers
  const handleIncrement = async () => {
    if (!isInCart) {
      setQuantity((q) => Math.min(maxStock, q + 1));
      return;
    }
    if (!user) return navigate("/login");
    if (updatingCartQty) return;
    if (currentCartQty >= maxStock) {
      toast.error(`Only ${maxStock} items available in stock`);
      return;
    }
    setUpdatingCartQty(true);
    try {
      await updateCartItem(product._id, currentCartQty + 1);
    } catch (err) {
      toast.error(err.message || "Could not update quantity");
    } finally {
      setUpdatingCartQty(false);
    }
  };

  const handleDecrement = async () => {
    if (!isInCart) {
      setQuantity((q) => Math.max(1, q - 1));
      return;
    }
    if (!user) return navigate("/login");
    if (updatingCartQty) return;
    setUpdatingCartQty(true);
    try {
      if (currentCartQty > 1) {
        await updateCartItem(product._id, currentCartQty - 1);
      } else {
        await removeFromCart(product._id);
        toast.success("Removed from cart");
        setQuantity(1);
      }
    } catch (err) {
      toast.error(err.message || "Could not update quantity");
    } finally {
      setUpdatingCartQty(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) return navigate("/login");
    if (isInCart) {
      navigate("/cart");
      return;
    }
    setAddingToCart(true);
    try {
      await addToCart(product._id, quantity);
      toast.success("Added to cart!");
    } catch (err) {
      toast.error(err.message || "Could not add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) return navigate("/login");
    try {
      if (!isInCart) {
        await addToCart(product._id, quantity);
      }
      navigate("/checkout");
    } catch (err) {
      toast.error(err.message || "Failed to initiate checkout");
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) return navigate("/login");
    try {
      if (isWished) {
        await removeFromWishlist(product._id);
        toast.success("Removed from wishlist");
      } else {
        await addToWishlist(product._id);
        toast.success("Saved to wishlist");
      }
    } catch (err) {
      toast.error(err.message || "Wishlist error");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    setSubmittingReview(true);
    try {
      const res = await api.post(`/products/${product._id}/reviews`, reviewForm);
      setReviews((prev) => [res.data?.review || res.data, ...prev]);
      setReviewForm({ rating: 5, comment: "" });
      setShowReviewModal(false);
      toast.success("Review submitted!");
    } catch (err) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12">
        {/* 1. Flipkart-style Top Breadcrumb */}
        <nav className="text-[12px] text-[#878787] mb-4 px-0.5 flex items-center flex-wrap gap-1 font-normal">
          <Link to="/" className="hover:text-[#2874f0] transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link
            to={`/products?category=${encodeURIComponent(product.category)}`}
            className="hover:text-[#2874f0] transition-colors"
          >
            {product.category}
          </Link>
          <span>/</span>
          {product.brand && (
            <>
              <Link
                to={`/products?brand=${encodeURIComponent(product.brand)}`}
                className="hover:text-[#2874f0] transition-colors"
              >
                {product.brand}
              </Link>
              <span className="px-1 text-slate-400">›</span>
              <span>/</span>
            </>
          )}
          <span className="text-[#212121] truncate max-w-xs sm:max-w-md font-normal">
            {product.name} ({activeColor})
          </span>
        </nav>

        {/* 2. Main Flipkart Hero Section (Exact 1:1 match with reference screenshot) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 items-start">
          
          {/* LEFT COLUMN (58% width): Dual Side-by-Side Large Rounded Cards */}
          <div className="lg:col-span-7 flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              
              {/* Card 1: Front / Primary Showcase Panel */}
              <div className="h-[380px] sm:h-[420px] lg:h-[450px] rounded-2xl bg-[#f0f2f5] p-6 sm:p-7 flex items-center justify-center overflow-hidden relative">
                <img
                  src={primaryDisplayImage}
                  alt={product.name}
                  onError={onProductImageError}
                  className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
                />
              </div>

              {/* Card 2: Back / Secondary Showcase Panel with Wishlist & Share */}
              <div className="h-[380px] sm:h-[420px] lg:h-[450px] rounded-2xl bg-[#f0f2f5] p-6 sm:p-7 flex items-center justify-center overflow-hidden relative">
                <img
                  src={secondaryDisplayImage}
                  alt={product.name}
                  onError={onProductImageError}
                  className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
                />

                {/* Top-Right Floating Wishlist & Share Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className="w-9 h-9 rounded-full shadow-sm bg-white border border-slate-200 flex items-center justify-center hover:scale-110 transition-transform"
                    title={isWished ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <svg
                      className={`w-4 h-4 ${isWished ? "fill-[#ff4343] text-[#ff4343]" : "fill-none stroke-slate-700"}`}
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-9 h-9 rounded-full shadow-sm bg-white border border-slate-200 flex items-center justify-center hover:scale-110 transition-transform text-slate-700"
                    title="Share product link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

        {/* RIGHT COLUMN (42% width): The 4 Flipkart Stacked Blocks */}
        <div className="lg:col-span-5 flex flex-col gap-3 justify-between">
          
          {/* BLOCK 1: Top Brand Sponsored Ad Strip */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-extrabold text-sm uppercase text-slate-900 tracking-wider shrink-0">
                {product.brand || "NexaMart"}
              </span>
              <span className="text-slate-300">|</span>
              <div className="text-xs text-slate-900 truncate">
                <span className="font-semibold">{product.name}</span>
                <span className="text-slate-500 block text-2xs">Starting From {formatINR(price)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <img
                src={primaryDisplayImage}
                alt=""
                onError={onProductImageError}
                className="w-9 h-9 object-contain"
              />
              <span className="text-3xs text-slate-400 border border-slate-200 rounded px-1 font-medium">Ad</span>
            </div>
          </div>

          {/* Title, Rating & Price Section */}
          <div className="py-0.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-[#388e3c] text-white text-2xs font-bold px-1.5 py-0.5 rounded-xs">
                {product.rating || "4.5"} ★
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({reviews.length} Ratings & Reviews)
              </span>
              <span className="text-2xs font-bold text-[#2874f0] bg-blue-50 px-2 py-0.5 rounded-xs">
                F-Assured
              </span>
              <span className={`text-2xs font-bold px-2 py-0.5 rounded-xs ${inStock ? "bg-green-50 text-[#388e3c]" : "bg-red-50 text-red-600"}`}>
                {inStock ? "In Stock" : "Currently Out of Stock"}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">{formatINR(price)}</span>
              {mrp > price && (
                <>
                  <span className="text-xs sm:text-sm text-slate-400 line-through font-normal">{formatINR(mrp)}</span>
                  <span className="text-xs sm:text-sm font-bold text-[#388e3c]">{discount}% off</span>
                </>
              )}
            </div>
          </div>

          {/* BLOCK 2: Selected Color Swatches */}
          <div>
            <div className="text-sm text-slate-900 mb-2 font-medium">
              <span className="text-slate-800">Selected Color: </span>
              <span className="font-bold text-slate-900">{activeColor}</span>
            </div>
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {colorSwatches.map((swatch, idx) => {
                const isSelected = selectedSwatchIndex === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedSwatchIndex(idx);
                      if (swatch.image) setSelectedImage(swatch.image);
                    }}
                    className={`w-[58px] h-[72px] rounded-xl p-1 bg-white flex flex-col items-center justify-center transition-all shrink-0 ${
                      isSelected
                        ? "border-2 border-black ring-1 ring-black/10 shadow-xs"
                        : "border border-slate-200 hover:border-slate-400"
                    }`}
                    title={swatch.name}
                  >
                    <img
                      src={swatch.image || PRODUCT_IMAGE_PLACEHOLDER}
                      alt={swatch.name}
                      onError={onProductImageError}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* BLOCK 3: The Bottom Action Box (Flipkart 1:1) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            {/* Top row: Product Title + In-line Quantity Stepper */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {product.brand ? `${product.brand} ` : ""}{product.name} ({activeColor})
              </h3>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-slate-500 font-medium">Qty:</span>
                <div className="flex items-center border border-slate-300 rounded-md bg-white shadow-2xs">
                  <button
                    type="button"
                    disabled={updatingCartQty || (isInCart ? currentCartQty <= 0 : quantity <= 1)}
                    onClick={handleDecrement}
                    className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-colors"
                    title="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="px-2 py-0.5 text-xs font-bold text-slate-900 min-w-[20px] text-center border-x border-slate-200">
                    {isInCart ? (updatingCartQty ? "..." : currentCartQty) : quantity}
                  </span>
                  <button
                    type="button"
                    disabled={updatingCartQty || (isInCart ? currentCartQty >= maxStock : quantity >= maxStock)}
                    onClick={handleIncrement}
                    className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-colors"
                    title="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom row: The 3 Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Button 1: Cart Icon Button */}
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart}
                className="w-12 h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center shrink-0 relative text-slate-700 shadow-2xs transition-colors"
                title={isInCart ? "Go to Cart" : "Add to Cart"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isInCart && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-3xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {currentCartQty}
                  </span>
                )}
              </button>

              {/* Button 2: Buy with EMI / Go to Cart */}
              <button
                type="button"
                onClick={isInCart ? () => navigate("/cart") : handleAddToCart}
                disabled={!inStock || addingToCart}
                className="flex-1 h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 flex flex-col justify-center text-left shadow-2xs transition-colors"
              >
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  {isInCart ? "Go to Cart" : "Buy with EMI"}
                </span>
                <span className="text-2xs text-slate-500 font-medium">
                  {isInCart ? `${currentCartQty} in cart` : `From ${formatINR(emiAmount)}/m`}
                </span>
              </button>

              {/* Button 3: Solid Yellow "Buy now at ₹..." */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!inStock}
                className="flex-1 h-12 rounded-xl bg-[#ffc200] hover:bg-[#f5b800] disabled:opacity-50 text-slate-900 px-4 flex flex-col items-center justify-center shrink-0 shadow-2xs transition-colors"
              >
                <span className="text-xs sm:text-sm font-bold">Buy now</span>
                <span className="text-2xs font-bold">at {formatINR(price)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Specifications, Description & Reviews Section */}
      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Description & Specifications */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">Product Description</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{product.description}</p>
            </div>

            {product.specs && Object.keys(product.specs).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Specifications</h3>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="grid grid-cols-12 text-xs">
                      <div className="col-span-4 bg-slate-50 p-2.5 font-medium text-slate-500">{key}</div>
                      <div className="col-span-8 p-2.5 text-slate-800 font-medium">{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Customer Reviews */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Customer Reviews ({reviews.length})
              </h3>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal((s) => !s)}
                  className="px-3 py-1 bg-[#2874f0] hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors"
                >
                  {showReviewModal ? "Cancel" : "Rate Product"}
                </button>
              )}
            </div>

            {/* Review form */}
            {showReviewModal && user && (
              <form onSubmit={handleReviewSubmit} className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col gap-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase">Write a Review</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Rating:</span>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium"
                  >
                    <option value={5}>5 ★ - Excellent</option>
                    <option value={4}>4 ★ - Very Good</option>
                    <option value={3}>3 ★ - Average</option>
                    <option value={2}>2 ★ - Poor</option>
                    <option value={1}>1 ★ - Terrible</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share details of your experience..."
                  required
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="self-start px-4 py-1.5 bg-[#2874f0] hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}

            {/* Reviews list */}
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No reviews yet for this product.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {reviews.map((r, i) => (
                  <div key={r._id || i} className="py-2.5 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#388e3c] text-white text-3xs font-bold px-1.5 py-0.5 rounded">
                        {r.rating || 5} ★
                      </span>
                      <span className="text-xs font-bold text-slate-800">{r.name || "Certified Buyer"}</span>
                      <span className="text-3xs text-[#388e3c] font-semibold">✓ Certified Buyer</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                    <span className="text-3xs text-slate-400">Reviewed on {formatDate(r.createdAt || new Date())}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* 4. Similar Products Section */}
        {related.length > 0 && (
          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Similar Products</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {related.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
