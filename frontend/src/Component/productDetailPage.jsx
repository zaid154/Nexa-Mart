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

  // Review states and eligibility
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewEligibility, setReviewEligibility] = useState({
    eligible: false,
    checked: false,
    reason: "",
  });

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

  // Check if current user is eligible to write a review (must have a delivered order)
  useEffect(() => {
    if (!user || !id) {
      setReviewEligibility({
        eligible: false,
        checked: true,
        reason: "Please sign in to write a review.",
      });
      return;
    }

    api
      .get(`/products/${id}/review-eligibility`)
      .then((res) => {
        const data = res.data || {};
        setReviewEligibility({
          eligible: Boolean(data.eligible),
          checked: true,
          reason: data.reason || "",
          existingReview: data.existingReview || null,
        });
        if (data.existingReview) {
          setReviewForm({
            rating: data.existingReview.rating || 5,
            comment: data.existingReview.comment || "",
          });
        }
      })
      .catch(() => {
        setReviewEligibility({
          eligible: false,
          checked: true,
          reason: "Only customers who have received delivery of this product can rate or review.",
        });
      });
  }, [id, user]);

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

  const emiAmount = Math.max(199, Math.round(price / 3));
  const primaryDisplayImage = selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER;
  const secondaryDisplayImage = images[1] || images[0] || PRODUCT_IMAGE_PLACEHOLDER;

  // Cart quantity controls
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
    if (!reviewEligibility.eligible) {
      toast.error(reviewEligibility.reason || "Only customers who have received delivery can review this product.");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await api.post(`/products/${product._id}/reviews`, reviewForm);
      const newReview = res.data?.review || res.data;
      setReviews((prev) => {
        const filtered = prev.filter(
          (r) => String(r._id) !== String(newReview._id) && String(r.user) !== String(user._id)
        );
        return [newReview, ...filtered];
      });
      setShowReviewModal(false);
      toast.success(res.data?.message || "Review submitted successfully!");
    } catch (err) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const hasSpecs = product.specs && typeof product.specs === "object" && Object.keys(product.specs).length > 0;

  return (
    <div className="min-h-screen bg-[#f1f3f6] py-2.5 sm:py-3.5">
      <div className="max-w-[1360px] mx-auto px-2.5 sm:px-4 lg:px-6">
        {/* Main Flipkart White Card Container */}
        <div className="bg-white rounded-xs border border-slate-200 p-3 sm:p-4 shadow-xs">
          {/* 1. Flipkart Top Breadcrumb */}
          <nav className="text-[11px] sm:text-[12px] text-[#878787] mb-2 flex items-center flex-wrap gap-1 font-normal">
            <Link to="/" className="hover:text-[#2874f0] transition-colors">
              Home
            </Link>
            <span>/</span>
            <Link
              to={`/products?category=${encodeURIComponent(product.category || "")}`}
              className="hover:text-[#2874f0] transition-colors"
            >
              {product.category || "Products"}
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
                <span>/</span>
              </>
            )}
            <span className="text-[#212121] truncate max-w-xs sm:max-w-md font-medium">
              {product.name} ({activeColor})
            </span>
          </nav>

          {/* 2. Main Flipkart Hero Section (Fits in Initial Screen View Without Scrolling) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 items-stretch">
            {/* LEFT COLUMN: Dual Side-by-Side Showcase Panels */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* Card 1: Front / Primary Showcase Panel */}
                <div className="h-[250px] sm:h-[280px] lg:h-[310px] xl:h-[330px] rounded-2xl bg-[#f0f2f5] p-3 sm:p-4 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={primaryDisplayImage}
                    alt={product.name}
                    onError={onProductImageError}
                    className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
                  />
                </div>

                {/* Card 2: Back / Secondary Showcase Panel with Wishlist & Share */}
                <div className="h-[250px] sm:h-[280px] lg:h-[310px] xl:h-[330px] rounded-2xl bg-[#f0f2f5] p-3 sm:p-4 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={secondaryDisplayImage}
                    alt={product.name}
                    onError={onProductImageError}
                    className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-300 hover:scale-105"
                  />

                  {/* Top-Right Floating Wishlist & Share Buttons */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={handleToggleWishlist}
                      className="w-8 h-8 rounded-full shadow-sm bg-white/95 border border-slate-200 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
                      title={isWished ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <svg
                        className={`w-3.5 h-3.5 ${
                          isWished ? "fill-[#ff4343] text-[#ff4343]" : "fill-none stroke-slate-700"
                        }`}
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-8 h-8 rounded-full shadow-sm bg-white/95 border border-slate-200 flex items-center justify-center hover:scale-110 transition-transform text-slate-700 cursor-pointer"
                      title="Share product link"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Stacked Flipkart Blocks */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-2">
              {/* BLOCK 1: Top Brand Sponsored Ad Strip */}
              <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-extrabold text-xs sm:text-sm uppercase text-slate-900 tracking-wider shrink-0">
                    {product.brand || "NexaMart"}
                  </span>
                  <span className="text-slate-300">|</span>
                  <div className="text-xs text-slate-900 truncate">
                    <span className="font-semibold block truncate">{product.name}</span>
                    <span className="text-slate-500 block text-2xs">Starting From {formatINR(price)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <img
                    src={primaryDisplayImage}
                    alt=""
                    onError={onProductImageError}
                    className="w-8 h-8 object-contain"
                  />
                  <span className="text-3xs text-slate-400 border border-slate-200 rounded px-1 font-medium">
                    Ad
                  </span>
                </div>
              </div>

              {/* Title, Rating & Price Section */}
              <div className="py-0.5">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-[#388e3c] text-white text-3xs font-bold px-1.5 py-0.5 rounded-xs">
                    {product.rating ? Number(product.rating).toFixed(1) : "4.5"} ★
                  </span>
                  <span className="text-2xs text-slate-500 font-medium">
                    ({reviews.length} Ratings &amp; Reviews)
                  </span>
                  <span className="text-3xs font-bold text-[#2874f0] bg-blue-50 px-1.5 py-0.5 rounded-xs">
                    F-Assured
                  </span>
                  <span
                    className={`text-3xs font-bold px-1.5 py-0.5 rounded-xs ${
                      inStock ? "bg-green-50 text-[#388e3c]" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-xl sm:text-2xl font-bold text-slate-900">{formatINR(price)}</span>
                  {mrp > price && (
                    <>
                      <span className="text-xs text-slate-400 line-through font-normal">{formatINR(mrp)}</span>
                      <span className="text-xs font-bold text-[#388e3c]">{discount}% off</span>
                    </>
                  )}
                </div>
              </div>

              {/* BLOCK 2: Selected Color Swatches */}
              <div>
                <div className="text-xs text-slate-900 mb-1 font-medium">
                  <span className="text-slate-600">Selected Color: </span>
                  <span className="font-bold text-slate-900">{activeColor}</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
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
                        className={`w-[44px] h-[54px] rounded-lg p-1 bg-white flex flex-col items-center justify-center transition-all shrink-0 cursor-pointer ${
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
              <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:p-3 shadow-xs">
                {/* Top row: Product Title + In-line Quantity Stepper */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {product.brand ? `${product.brand} ` : ""}
                    {product.name} ({activeColor})
                  </h3>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-2xs text-slate-500 font-medium">Qty:</span>
                    <div className="flex items-center border border-slate-300 rounded bg-white shadow-2xs">
                      <button
                        type="button"
                        disabled={updatingCartQty || (isInCart ? currentCartQty <= 0 : quantity <= 1)}
                        onClick={handleDecrement}
                        className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer"
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
                        className="px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold transition-colors cursor-pointer"
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
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center shrink-0 relative text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    title={isInCart ? "Go to Cart" : "Add to Cart"}
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    {isInCart && (
                      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-3xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {currentCartQty}
                      </span>
                    )}
                  </button>

                  {/* Button 2: Go to Cart / Buy with EMI */}
                  <button
                    type="button"
                    onClick={isInCart ? () => navigate("/cart") : handleAddToCart}
                    disabled={!inStock || addingToCart}
                    className="flex-1 h-10 sm:h-11 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-2 sm:px-3 flex flex-col justify-center text-left shadow-2xs transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {isInCart ? "Go to Cart" : "Buy with EMI"}
                    </span>
                    <span className="text-3xs text-slate-500 font-medium">
                      {isInCart ? `${currentCartQty} in cart` : `From ${formatINR(emiAmount)}/m`}
                    </span>
                  </button>

                  {/* Button 3: Solid Yellow "Buy now at ₹..." */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="flex-1 h-10 sm:h-11 rounded-lg bg-[#ffc200] hover:bg-[#f5b800] disabled:opacity-50 text-slate-900 px-3 flex flex-col items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold leading-tight">Buy now</span>
                    <span className="text-3xs font-bold">at {formatINR(price)}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Product Description & Specifications (Separate Full-Width Section) */}
          <div className="mt-6 border-t border-slate-200 pt-5 space-y-4">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                Product Description
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description || "No description provided for this product."}
              </p>
            </div>

            {hasSpecs && (
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                  Specifications
                </h3>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="grid grid-cols-12 text-xs">
                      <div className="col-span-4 sm:col-span-3 bg-slate-50 p-2 sm:p-2.5 font-medium text-slate-500">
                        {key}
                      </div>
                      <div className="col-span-8 sm:col-span-9 p-2 sm:p-2.5 text-slate-800 font-medium">
                        {String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Customer Reviews (Separate Full-Width Section - No Empty Space) */}
          <div className="mt-6 border-t border-slate-200 pt-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                Customer Reviews ({reviews.length})
              </h3>

              {/* Rate Product Button: Visible only if user has a DELIVERED order for this item */}
              {user && reviewEligibility.eligible && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal((s) => !s)}
                  className="px-3 py-1 bg-[#2874f0] hover:bg-blue-600 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  {showReviewModal
                    ? "Cancel"
                    : reviewEligibility.existingReview
                    ? "Edit Review"
                    : "Rate Product"}
                </button>
              )}
            </div>

            {/* Eligibility Notice: Shown when user has NOT received delivery of this product */}
            {!reviewEligibility.eligible && reviewEligibility.checked && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-2xs text-slate-600 leading-relaxed flex items-center gap-2">
                <span className="text-base shrink-0">🛡️</span>
                <div className="flex-1">
                  {user ? (
                    <span>
                      Only verified customers whose orders have been <strong>Delivered</strong> can rate and review this product.
                    </span>
                  ) : (
                    <span>
                      Please{" "}
                      <Link to="/login" className="text-[#2874f0] font-bold hover:underline">
                        sign in
                      </Link>{" "}
                      with an account whose orders have been Delivered to rate and review this product.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Review Form for Verified Delivered Buyers */}
            {showReviewModal && user && reviewEligibility.eligible && (
              <form
                onSubmit={handleReviewSubmit}
                className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col gap-2.5 shadow-2xs max-w-xl"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {reviewEligibility.existingReview ? "Edit Your Review" : "Write a Review"}
                  </h4>
                  <span className="text-3xs font-semibold text-[#388e3c] bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                    ✓ Verified Delivery
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">Rating:</span>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white font-medium focus:border-[#2874f0] focus:outline-none"
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
                  placeholder="Share your honest feedback about this product..."
                  required
                  className="w-full text-xs p-2 rounded border border-slate-300 bg-white focus:border-[#2874f0] focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="self-start px-4 py-1.5 bg-[#fb641b] hover:bg-[#e85a14] disabled:opacity-50 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No reviews yet for this product.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {reviews.map((r, i) => (
                  <div key={r._id || i} className="py-2.5 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#388e3c] text-white text-3xs font-bold px-1.5 py-0.5 rounded-xs">
                        {r.rating || 5} ★
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {r.name || "Certified Buyer"}
                      </span>
                      <span className="text-3xs text-[#388e3c] font-semibold">
                        ✓ Certified Buyer
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                    <span className="text-3xs text-slate-400">
                      Reviewed on {formatDate(r.createdAt || new Date())}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 4. Similar Products Section */}
        {related.length > 0 && (
          <div className="mt-4 bg-white rounded-xs border border-slate-200 p-3 sm:p-4 shadow-xs">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              Similar Products
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
