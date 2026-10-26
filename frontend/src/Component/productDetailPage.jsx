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
  const { cart, addToCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("specs");
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch product data, reviews, and category recommendations
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
        setSelectedVariantId(prod?.variants?.[0]?._id || null);
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
      <div className="max-w-7xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-lg border border-slate-200 text-center">
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">The product you are looking for does not exist.</p>
        <Link to="/products" className="mt-4 inline-block px-5 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
          Browse Products
        </Link>
      </div>
    );
  }

  const variants = product.variants || [];
  const activeVariant = variants.find((v) => String(v._id) === String(selectedVariantId)) || variants[0] || null;
  const price = activeVariant?.price ?? product.price ?? 0;
  const mrp = activeVariant?.mrp ?? product.mrp ?? 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const inStock = (activeVariant?.countInStock ?? product.countInStock ?? 0) > 0;
  const isWished = inWishlist(product._id);

  // Filter items in cart that belong to this product
  const cartItemsForThisProduct = (cart?.items || []).filter(
    (item) => String(item.product?._id || item.product?.id || item.product) === String(product._id)
  );

  // Check if currently selected variant is in the cart
  const currentVariantInCart = cartItemsForThisProduct.find((item) => {
    const itemVarId = item.variant?._id || item.variant?.id || item.variant || null;
    return String(itemVarId || "") === String(selectedVariantId || "");
  });

  const isCurrentVariantInCart = Boolean(currentVariantInCart);

  const images = [
    ...(product.images || []),
    ...(product.image ? [product.image] : []),
  ].filter((img, i, arr) => img && arr.indexOf(img) === i);

  const handleAddToCart = async () => {
    if (!user) return navigate("/login");
    setAddingToCart(true);
    try {
      await addToCart(product._id, quantity, selectedVariantId);
      const varLabel = activeVariant
        ? Object.entries(activeVariant.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || activeVariant.sku || activeVariant.name
        : "";
      toast.success(varLabel ? `Added "${varLabel}" to cart!` : "Added to cart!");
    } catch (err) {
      toast.error(err.message || "Could not add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) return navigate("/login");
    try {
      if (!isCurrentVariantInCart) {
        await addToCart(product._id, quantity, selectedVariantId);
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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    setSubmittingReview(true);
    try {
      const res = await api.post(`/products/${product._id}/reviews`, reviewForm);
      setReviews((prev) => [res.data?.review || res.data, ...prev]);
      setReviewForm({ rating: 5, comment: "" });
      toast.success("Review submitted!");
    } catch (err) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="w-full pb-8">
      {/* Main product showcase */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 shadow-xs">
        {/* Left: Image gallery */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="relative aspect-square w-full rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
            <img
              src={selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER}
              alt={product.name}
              onError={onProductImageError}
              className="max-h-full max-w-full object-contain p-4 transition-transform duration-300 hover:scale-105"
            />
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`absolute top-3 right-3 p-2.5 rounded-full shadow-md bg-white border border-slate-200 transition-colors ${
                isWished ? "text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-slate-600"
              }`}
              title={isWished ? "Remove from wishlist" : "Add to wishlist"}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>

          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-md border p-1 bg-white shrink-0 overflow-hidden ${
                    selectedImage === img ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <img src={img} alt="" onError={onProductImageError} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            {isCurrentVariantInCart ? (
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="w-full py-3.5 px-3 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Go to Cart ({currentVariantInCart.quantity})
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || addingToCart}
                className="w-full py-3.5 px-3 rounded-md font-semibold text-white bg-[#ff9f00] hover:bg-[#f39700] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {addingToCart ? "Adding..." : "Add to Cart"}
              </button>
            )}

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock}
              className="w-full py-3.5 px-3 rounded-md font-semibold text-white bg-[#fb641b] hover:bg-[#e85a14] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-xs text-xs sm:text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Buy Now
            </button>
          </div>

          {/* Quick add-more button if already in cart */}
          {isCurrentVariantInCart && (
            <div className="flex items-center justify-between text-2xs text-slate-600 px-1 pt-0.5">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <span>✓</span> In cart: {currentVariantInCart.quantity} item{currentVariantInCart.quantity > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="text-blue-600 hover:text-blue-700 font-bold underline cursor-pointer"
              >
                {addingToCart ? "Adding..." : "+ Add 1 more"}
              </button>
            </div>
          )}
        </div>

        {/* Right: Details & options */}
        <div className="md:col-span-7 flex flex-col gap-3.5">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              {product.brand || product.category}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 bg-[#388e3c] text-white text-xs font-bold px-2 py-0.5 rounded">
              {product.rating || "4.5"} ★
            </span>
            <span className="text-xs text-slate-500 font-medium">{reviews.length} Ratings & Reviews</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {inStock ? "In Stock" : "Currently Out of Stock"}
            </span>
          </div>

          <div className="flex items-baseline gap-3 pt-1 border-t border-slate-100">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{formatINR(price)}</span>
            {mrp > price && (
              <>
                <span className="text-sm sm:text-base text-slate-400 line-through">{formatINR(mrp)}</span>
                <span className="text-xs sm:text-sm font-bold text-[#388e3c]">{discount}% off</span>
              </>
            )}
          </div>

          {/* Variant Selection Chips with In-Cart indicators */}
          {variants.length > 1 && (
            <div className="pt-1.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Select Option:
                </label>
                {cartItemsForThisProduct.length > 0 && (
                  <span className="text-2xs text-emerald-700 font-semibold flex items-center gap-1">
                    <span>✓</span> {cartItemsForThisProduct.length} {cartItemsForThisProduct.length === 1 ? "option" : "options"} in cart
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const label = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(" / ") || v.name || formatINR(v.price);
                  const isSelected = String(v._id) === String(selectedVariantId);
                  const vInCart = cartItemsForThisProduct.find((ci) => {
                    const itemVarId = ci.variant?._id || ci.variant?.id || ci.variant || null;
                    return String(itemVarId || "") === String(v._id);
                  });

                  return (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v._id);
                        if (v.image) setSelectedImage(v.image);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-xs ring-1 ring-blue-600"
                          : "border-slate-300 text-slate-700 hover:border-slate-400 bg-white"
                      }`}
                    >
                      <span>{label}</span>
                      {vInCart && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          ✓ ({vInCart.quantity})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Quantity:</span>
            <div className="flex items-center border border-slate-300 rounded-md">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-1 text-slate-600 hover:bg-slate-100 text-sm font-bold"
              >
                -
              </button>
              <span className="px-3 py-1 text-sm font-semibold text-slate-800">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="px-3 py-1 text-slate-600 hover:bg-slate-100 text-sm font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* In-Cart Status Alert */}
          {isCurrentVariantInCart && (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                This option is in your cart (<strong>Qty: {currentVariantInCart.quantity}</strong>)
              </span>
              <Link to="/cart" className="font-bold text-emerald-800 hover:text-emerald-950 underline">
                Go to Cart &rarr;
              </Link>
            </div>
          )}

          {/* Multiple variants summary snapshot */}
          {cartItemsForThisProduct.length > 1 && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-blue-900">
              <div className="flex items-center justify-between font-bold mb-1.5">
                <span className="flex items-center gap-1.5">
                  <span>🛒</span> Multiple options added to cart ({cartItemsForThisProduct.length}):
                </span>
                <Link to="/cart" className="text-blue-700 hover:underline font-semibold">Open Cart &rarr;</Link>
              </div>
              <div className="space-y-1">
                {cartItemsForThisProduct.map((ci, idx) => {
                  const vTitle = ci.variant?.name || Object.entries(ci.variant?.attributes || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "Default";
                  return (
                    <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1 rounded border border-blue-100 text-2xs">
                      <span className="font-medium text-slate-800">• {vTitle}</span>
                      <span className="font-bold text-blue-800">Qty: {ci.quantity} ({formatINR(ci.unitPrice * ci.quantity)})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Description</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{product.description}</p>
          </div>

          {/* Available Offers Section (Flipkart style) */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span className="text-emerald-600">🏷️</span> Available Offers
            </h3>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 shrink-0">Bank Offer:</span>
                <span>5% Unlimited Cashback on Flipkart Axis Bank Credit Card</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 shrink-0">Special Price:</span>
                <span>Extra discount applied automatically at checkout</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-slate-800 shrink-0">Partner Offer:</span>
                <span>Sign up for NexaPay &amp; get flat ₹100 instant cashback on your first purchase</span>
              </div>
            </div>
          </div>

          {/* Key Specs / Highlights (derived from product.specs) */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Key Highlights</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(product.specs).slice(0, 6).map(([k, v]) => (
                  <div key={k} className="flex flex-col bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-2xs text-slate-400 uppercase font-medium">{k}</span>
                    <span className="font-semibold text-slate-800 truncate" title={String(v)}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery & Trust Guarantee Badges */}
          <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-md text-center">
              <span className="text-sm block mb-0.5">🚚</span>
              <span className="text-2xs font-bold text-slate-800 block">Free Delivery</span>
              <span className="text-3xs text-slate-400 block">In 2-4 days</span>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-md text-center">
              <span className="text-sm block mb-0.5">🔄</span>
              <span className="text-2xs font-bold text-slate-800 block">7-Day Return</span>
              <span className="text-3xs text-slate-400 block">Hassle free</span>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-md text-center">
              <span className="text-sm block mb-0.5">🛡️</span>
              <span className="text-2xs font-bold text-slate-800 block">1 Year Warranty</span>
              <span className="text-3xs text-slate-400 block">Brand warranty</span>
            </div>
            <div className="p-2 bg-slate-50 border border-slate-100 rounded-md text-center">
              <span className="text-sm block mb-0.5">💵</span>
              <span className="text-2xs font-bold text-slate-800 block">COD Available</span>
              <span className="text-3xs text-slate-400 block">Pay at doorstep</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Reviews tabs */}
      <div className="mt-6 bg-white rounded-lg border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="flex border-b border-slate-200 gap-6">
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "specs" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Specifications
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "reviews" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Ratings & Reviews ({reviews.length})
          </button>
        </div>

        {activeTab === "specs" && (
          <div className="py-4">
            {product.specs && Object.keys(product.specs).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {Object.entries(product.specs).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium">{key}</span>
                    <span className="text-slate-800 font-semibold">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4">Standard manufacturer specifications apply for this model.</p>
            )}
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="py-4 flex flex-col gap-6">
            {user && (
              <form onSubmit={handleReviewSubmit} className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase">Write a Customer Review</h4>
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
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share details of your experience with this product..."
                  required
                  className="w-full text-xs p-2.5 rounded border border-slate-300 bg-white"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="self-start px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No customer reviews yet. Be the first to review this product!</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {reviews.map((r, i) => (
                  <div key={r._id || i} className="py-3 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#388e3c] text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        {r.rating || 5} ★
                      </span>
                      <span className="text-xs font-bold text-slate-800">{r.title || r.name || "Verified Buyer"}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                    <span className="text-xs text-slate-400">Reviewed on {formatDate(r.createdAt || new Date())}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Similar products */}
      {related.length > 0 && (
        <div className="mt-6 bg-white rounded-lg border border-slate-200 p-5 sm:p-6 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4">Similar Products</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
