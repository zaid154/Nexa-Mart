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
  const [pincode, setPincode] = useState("110025");
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
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-xs border border-[#e0e0e0] text-center shadow-xs">
        <h2 className="text-xl font-bold text-[#212121]">Product Not Found</h2>
        <p className="mt-2 text-sm text-[#878787]">The product you are looking for does not exist.</p>
        <Link
          to="/products"
          className="mt-4 inline-block px-5 py-2.5 bg-[#2874f0] text-white font-medium rounded-xs hover:bg-blue-600 transition-colors"
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

  // Check if product is currently in the cart
  const cartItem = (cart?.items || []).find((item) => {
    return String(item.product?._id || item.product?.id || item.product) === String(product._id);
  });

  const isInCart = Boolean(cartItem);
  const currentCartQty = cartItem ? cartItem.quantity : 0;

  const images = [
    ...(product.images || []),
    ...(product.image ? [product.image] : []),
  ].filter((img, i, arr) => img && arr.indexOf(img) === i);

  // Estimated delivery date (2 business days out)
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 2);
  const deliveryFormatted = deliveryDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  // Highlights list
  const highlights = [
    ...(product.benefits || []),
    ...(product.specs ? Object.entries(product.specs).slice(0, 4).map(([k, v]) => `${k}: ${v}`) : []),
  ].slice(0, 5);

  const specsEntries = Object.entries(product.specs || {});

  // Increment quantity in cart or locally
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

  // Decrement quantity in cart or locally
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

  const handleCheckPincode = (e) => {
    e.preventDefault();
    if (pincode.trim().length === 6) {
      toast.success(`Delivery available to ${pincode}!`);
    } else {
      toast.error("Please enter a valid 6-digit pincode");
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
    <div className="w-full pb-10">
      {/* 1. Flipkart Breadcrumb */}
      <nav className="text-[12px] text-[#878787] mb-2 px-1 flex items-center flex-wrap gap-1 font-normal">
        <Link to="/" className="hover:text-[#2874f0] transition-colors">
          Home
        </Link>
        <span>›</span>
        <Link
          to={`/products?category=${encodeURIComponent(product.category)}`}
          className="hover:text-[#2874f0] transition-colors"
        >
          {product.category}
        </Link>
        {product.brand && (
          <>
            <span>›</span>
            <Link
              to={`/products?brand=${encodeURIComponent(product.brand)}`}
              className="hover:text-[#2874f0] transition-colors"
            >
              {product.brand}
            </Link>
          </>
        )}
        <span>›</span>
        <span className="text-[#212121] truncate max-w-xs sm:max-w-md">{product.name}</span>
      </nav>

      {/* 2. Main Flipkart Product Showcase Card */}
      <div className="bg-white rounded-none sm:rounded-xs border border-[#e0e0e0] p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 shadow-2xs">
        
        {/* LEFT COLUMN: Image Showcase & Primary Buttons (Sticky on Desktop) */}
        <div className="md:col-span-5 lg:col-span-5 md:sticky md:top-4 self-start flex flex-col gap-3">
          {/* Main Photo Box */}
          <div className="relative w-full h-[360px] sm:h-[420px] rounded-xs border border-[#f0f0f0] bg-white p-4 flex items-center justify-center overflow-hidden">
            <img
              src={selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER}
              alt={product.name}
              onError={onProductImageError}
              className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
            />

            {/* Wishlist & Share Floating Buttons */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
              <button
                type="button"
                onClick={handleToggleWishlist}
                className="p-2 rounded-full shadow-md bg-white border border-[#e0e0e0] hover:scale-110 transition-transform"
                title={isWished ? "Remove from wishlist" : "Add to wishlist"}
              >
                <svg
                  className={`w-4 h-4 ${isWished ? "fill-[#ff4343] text-[#ff4343]" : "fill-none stroke-[#878787]"}`}
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-full shadow-md bg-white border border-[#e0e0e0] hover:scale-110 transition-transform text-[#878787]"
                title="Share product link"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-14 h-14 rounded-xs border-2 p-1 bg-white shrink-0 overflow-hidden transition-all ${
                    selectedImage === img
                      ? "border-[#2874f0] ring-1 ring-[#2874f0]"
                      : "border-[#e0e0e0] hover:border-[#878787]"
                  }`}
                >
                  <img src={img} alt="" onError={onProductImageError} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}

          {/* Flipkart Sticky Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || addingToCart}
              className="h-12 rounded-xs bg-[#ff9f00] hover:bg-[#f39700] disabled:opacity-50 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
              {isInCart ? "Go to Cart" : addingToCart ? "Adding..." : "Add to Cart"}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock}
              className="h-12 rounded-xs bg-[#fb641b] hover:bg-[#f05a10] disabled:opacity-50 text-white font-bold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M7 2v11h3v9l7-12h-4l4-8z" />
              </svg>
              Buy Now
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Product Details, Quantity, Pricing, Offers & Specs */}
        <div className="md:col-span-7 lg:col-span-7 flex flex-col gap-3.5">
          {/* Top Brand Ad Strip */}
          <div className="rounded-xs border border-[#e0e0e0] bg-[#fafafa] p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black text-[#212121] tracking-wider uppercase shrink-0">
                {product.brand || "NexaMart"}
              </span>
              <span className="text-slate-300">|</span>
              <div className="text-xs text-[#212121] truncate">
                <span className="font-semibold">{product.name}</span>
                <span className="block text-2xs text-[#878787]">Starting From {formatINR(price)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <img
                src={selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER}
                alt=""
                onError={onProductImageError}
                className="w-8 h-8 object-contain"
              />
              <span className="text-3xs text-[#878787] border border-[#e0e0e0] rounded px-1 self-start font-medium">Ad</span>
            </div>
          </div>

          {/* Title & Brand */}
          <div>
            <h1 className="text-base sm:text-lg font-medium text-[#212121] leading-snug">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-[#388e3c] text-white text-2xs font-bold px-1.5 py-0.5 rounded-xs">
                {product.rating || "4.5"} ★
              </span>
              <span className="text-xs text-[#878787] font-medium">
                {reviews.length} Ratings & {reviews.length} Reviews
              </span>
              <span className="text-2xs font-bold text-[#2874f0] bg-blue-50 px-2 py-0.5 rounded-xs">
                F-Assured
              </span>
              <span className={`text-2xs font-bold px-2 py-0.5 rounded-xs ${inStock ? "bg-green-50 text-[#388e3c]" : "bg-red-50 text-red-600"}`}>
                {inStock ? "In Stock" : "Currently Out of Stock"}
              </span>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="flex items-baseline gap-2.5 pt-1">
            <span className="text-2xl sm:text-3xl font-bold text-[#212121]">{formatINR(price)}</span>
            {mrp > price && (
              <>
                <span className="text-xs sm:text-sm text-[#878787] line-through font-normal">{formatINR(mrp)}</span>
                <span className="text-xs sm:text-sm font-bold text-[#388e3c]">{discount}% off</span>
              </>
            )}
          </div>

          {/* Available Offers */}
          <div className="space-y-1.5 py-1">
            <h3 className="text-xs font-bold text-[#212121]">Available Offers</h3>
            <div className="space-y-1.5 text-xs text-[#212121]">
              <div className="flex items-start gap-2">
                <span className="text-[#388e3c] font-bold text-xs shrink-0">🏷️</span>
                <span>
                  <strong>Bank Offer:</strong> 5% Unlimited Cashback on Flipkart Axis Bank Card{" "}
                  <span className="text-[#2874f0] font-semibold cursor-pointer hover:underline">T&amp;C</span>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#388e3c] font-bold text-xs shrink-0">🏷️</span>
                <span>
                  <strong>Special Price:</strong> Get extra ₹{Math.max(100, Math.round(price * 0.15))} off (price inclusive of cashback){" "}
                  <span className="text-[#2874f0] font-semibold cursor-pointer hover:underline">T&amp;C</span>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#388e3c] font-bold text-xs shrink-0">🏷️</span>
                <span>
                  <strong>Partner Offer:</strong> Sign up for NexaMart Pay Later &amp; get free rewards{" "}
                  <span className="text-[#2874f0] font-semibold cursor-pointer hover:underline">Know More</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quantity Stepper Row */}
          <div className="flex items-center gap-4 py-2.5 border-y border-[#f0f0f0]">
            <span className="text-xs font-bold text-[#878787] uppercase tracking-wide">Quantity:</span>
            <div className="flex items-center border border-[#c2c2c2] rounded-xs bg-white shadow-2xs">
              <button
                type="button"
                disabled={updatingCartQty || (isInCart ? currentCartQty <= 0 : quantity <= 1)}
                onClick={handleDecrement}
                className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-sm font-bold transition-colors"
                title="Decrease quantity"
              >
                −
              </button>
              <span className="w-10 h-7 flex items-center justify-center text-xs font-bold text-[#212121] border-x border-[#e0e0e0]">
                {isInCart ? (updatingCartQty ? "..." : currentCartQty) : quantity}
              </span>
              <button
                type="button"
                disabled={updatingCartQty || (isInCart ? currentCartQty >= maxStock : quantity >= maxStock)}
                onClick={handleIncrement}
                className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-sm font-bold transition-colors"
                title="Increase quantity"
              >
                +
              </button>
            </div>
            {isInCart ? (
              <span className="inline-flex items-center gap-1 text-2xs font-bold text-[#388e3c] bg-green-50 px-2 py-0.5 rounded-full">
                ✓ Added in Cart ({currentCartQty})
              </span>
            ) : (
              <span className="text-2xs text-[#878787]">
                {inStock ? `(${maxStock} in stock)` : "Out of stock"}
              </span>
            )}
          </div>

          {/* Delivery & Pincode Checker */}
          <div className="grid grid-cols-12 gap-3 py-2 text-xs">
            <div className="col-span-3 text-[#878787] font-semibold">Delivery</div>
            <div className="col-span-9 space-y-1.5">
              <form onSubmit={handleCheckPincode} className="flex items-center gap-2">
                <div className="flex items-center border-b-2 border-[#2874f0] pb-0.5">
                  <svg className="w-3.5 h-3.5 text-[#2874f0] mr-1 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter Pincode"
                    className="w-24 text-xs font-semibold text-[#212121] outline-hidden bg-transparent"
                  />
                  <button
                    type="submit"
                    className="text-xs font-bold text-[#2874f0] hover:underline cursor-pointer ml-1"
                  >
                    Check
                  </button>
                </div>
              </form>
              <p className="text-xs text-[#212121] font-medium">
                Delivery by <span className="font-bold">{deliveryFormatted}</span> |{" "}
                <span className="text-[#388e3c] font-semibold">Free</span>{" "}
                <span className="text-[#878787] line-through">₹40</span>
              </p>
              <p className="text-2xs text-[#878787]">if ordered before 11:59 PM</p>
            </div>
          </div>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="grid grid-cols-12 gap-3 py-2 border-t border-[#f0f0f0] text-xs">
              <div className="col-span-3 text-[#878787] font-semibold">Highlights</div>
              <div className="col-span-9">
                <ul className="space-y-1 text-xs text-[#212121] list-disc list-inside">
                  {highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Services */}
          <div className="grid grid-cols-12 gap-3 py-2 border-t border-[#f0f0f0] text-xs">
            <div className="col-span-3 text-[#878787] font-semibold">Services</div>
            <div className="col-span-9 space-y-1 text-xs text-[#212121]">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2874f0]"></span>
                <span>7 Days Replacement Policy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2874f0]"></span>
                <span>Cash on Delivery available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2874f0]"></span>
                <span>1 Year Manufacturer Warranty</span>
              </div>
            </div>
          </div>

          {/* Seller */}
          <div className="grid grid-cols-12 gap-3 py-2 border-t border-[#f0f0f0] text-xs">
            <div className="col-span-3 text-[#878787] font-semibold">Seller</div>
            <div className="col-span-9 space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2874f0]">{product.brand || "NexaMart Retail"}</span>
                <span className="bg-[#2874f0] text-white text-3xs font-bold px-1.5 py-0.2 rounded">4.8 ★</span>
              </div>
              <p className="text-2xs text-[#878787]">7 Days Replacement Policy • GST Invoice Available</p>
            </div>
          </div>

          {/* Description */}
          <div className="py-2.5 border-t border-[#f0f0f0]">
            <h3 className="text-xs font-bold text-[#212121] uppercase tracking-wide mb-1.5">Product Description</h3>
            <p className="text-xs text-[#212121] leading-relaxed">{product.description}</p>
          </div>

          {/* Specifications Table */}
          {specsEntries.length > 0 && (
            <div className="py-2.5 border-t border-[#f0f0f0]">
              <h3 className="text-xs font-bold text-[#212121] uppercase tracking-wide mb-2.5">Specifications</h3>
              <div className="border border-[#e0e0e0] rounded-xs divide-y divide-[#e0e0e0]">
                {specsEntries.map(([key, val]) => (
                  <div key={key} className="grid grid-cols-12 text-xs">
                    <div className="col-span-4 bg-[#f9f9f9] p-2.5 font-medium text-[#878787]">{key}</div>
                    <div className="col-span-8 p-2.5 text-[#212121] font-medium">{String(val)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ratings & Customer Reviews Section */}
          <div className="py-3 border-t border-[#f0f0f0]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#212121] uppercase tracking-wide">
                Ratings &amp; Reviews ({reviews.length})
              </h3>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowReviewModal((s) => !s)}
                  className="px-3 py-1 bg-[#2874f0] hover:bg-blue-600 text-white rounded-xs text-xs font-bold transition-colors"
                >
                  {showReviewModal ? "Cancel" : "Rate Product"}
                </button>
              )}
            </div>

            {/* Rate Product Form */}
            {showReviewModal && user && (
              <form onSubmit={handleReviewSubmit} className="bg-[#fafafa] rounded-xs p-3.5 border border-[#e0e0e0] flex flex-col gap-2.5 mb-4">
                <h4 className="text-xs font-bold text-[#212121] uppercase">Write a Customer Review</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#878787]">Rating:</span>
                  <select
                    value={reviewForm.rating}
                    onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}
                    className="text-xs border border-[#c2c2c2] rounded px-2 py-1 bg-white font-medium"
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
                  placeholder="Share details of your experience with this product..."
                  required
                  className="w-full text-xs p-2 rounded border border-[#c2c2c2] bg-white outline-hidden"
                />
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="self-start px-4 py-1.5 bg-[#2874f0] hover:bg-blue-600 text-white rounded-xs text-xs font-bold transition-colors"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <p className="text-xs text-[#878787] py-2">No reviews yet. Be the first to review this product!</p>
            ) : (
              <div className="divide-y divide-[#f0f0f0]">
                {reviews.map((r, i) => (
                  <div key={r._id || i} className="py-2.5 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#388e3c] text-white text-3xs font-bold px-1.5 py-0.5 rounded">
                        {r.rating || 5} ★
                      </span>
                      <span className="text-xs font-bold text-[#212121]">{r.name || "Certified Buyer"}</span>
                      <span className="text-3xs text-[#388e3c] font-semibold">✓ Certified Buyer</span>
                    </div>
                    <p className="text-xs text-[#212121] leading-relaxed">{r.comment}</p>
                    <span className="text-3xs text-[#878787]">Reviewed on {formatDate(r.createdAt || new Date())}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Similar Products Section */}
      {related.length > 0 && (
        <div className="mt-4 bg-white rounded-none sm:rounded-xs border border-[#e0e0e0] p-4 sm:p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-[#212121] uppercase tracking-wide mb-3">Similar Products</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
