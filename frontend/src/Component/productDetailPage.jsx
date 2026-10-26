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
  const { cart, addToCart, updateCartItem, removeFromCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [updatingCartQty, setUpdatingCartQty] = useState(false);
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
  const mrp = activeVariant?.mrp ?? (product.mrp && product.mrp > price ? product.mrp : Math.round(price * 1.35));
  const inStock = (activeVariant?.countInStock ?? product.countInStock ?? 0) > 0;
  const maxStock = activeVariant?.countInStock ?? product.countInStock ?? 99;
  const isWished = inWishlist(product._id);

  // Active variant label (e.g. "Sky Blue, 64 GB")
  const activeVariantLabel = activeVariant
    ? Object.entries(activeVariant.attributes || {}).map(([, v]) => String(v)).join(", ") || activeVariant.name || activeVariant.sku || ""
    : "";

  // Check if variants have a color attribute
  const colorAttrKey = activeVariant
    ? Object.keys(activeVariant.attributes || {}).find((k) => k.toLowerCase() === "color")
    : null;
  const activeColor = colorAttrKey ? activeVariant.attributes[colorAttrKey] : null;

  // Monthly EMI estimation
  const emiAmount = Math.max(299, Math.round(price / 3));

  // Check if currently selected variant is in the cart
  const cartItem = (cart?.items || []).find((item) => {
    const matchProduct = String(item.product?._id || item.product?.id || item.product) === String(product._id);
    const itemVarId = item.variant?._id || item.variant?.id || item.variant || null;
    const matchVariant = String(itemVarId || "") === String(selectedVariantId || "");
    return matchProduct && matchVariant;
  });

  const isCurrentVariantInCart = Boolean(cartItem);
  const currentCartQty = cartItem ? cartItem.quantity : 0;

  const images = [
    ...(product.images || []),
    ...(product.image ? [product.image] : []),
  ].filter((img, i, arr) => img && arr.indexOf(img) === i);

  // Directly increment quantity in cart
  const handleIncrementCartQty = async () => {
    if (!user) return navigate("/login");
    if (updatingCartQty) return;
    if (currentCartQty >= maxStock) {
      toast.error(`Only ${maxStock} items available in stock`);
      return;
    }
    setUpdatingCartQty(true);
    try {
      await updateCartItem(product._id, currentCartQty + 1, selectedVariantId);
    } catch (err) {
      toast.error(err.message || "Could not update quantity");
    } finally {
      setUpdatingCartQty(false);
    }
  };

  // Directly decrement quantity in cart
  const handleDecrementCartQty = async () => {
    if (!user) return navigate("/login");
    if (updatingCartQty) return;
    setUpdatingCartQty(true);
    try {
      if (currentCartQty > 1) {
        await updateCartItem(product._id, currentCartQty - 1, selectedVariantId);
      } else {
        await removeFromCart(product._id, selectedVariantId);
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
    setAddingToCart(true);
    try {
      await addToCart(product._id, quantity, selectedVariantId);
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
      toast.success("Review submitted!");
    } catch (err) {
      toast.error(err.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="w-full pb-8">
      {/* 1. Flipkart Breadcrumb Navigation */}
      <nav className="text-[12px] text-[#878787] mb-2 px-1 flex items-center flex-wrap gap-1 font-normal">
        <Link to="/" className="hover:text-[#2874f0] transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-[#2874f0] transition-colors">
          {product.category}
        </Link>
        {product.brand && (
          <>
            <span>/</span>
            <Link to={`/products?brand=${encodeURIComponent(product.brand)}`} className="hover:text-[#2874f0] transition-colors">
              {product.brand}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[#212121] truncate max-w-xs sm:max-w-md">
          {product.name} {activeVariantLabel ? `(${activeVariantLabel})` : ""}
        </span>
      </nav>

      {/* Main Flipkart-Style 2-Section Split Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6 shadow-xs">
        {/* SECTION 1 (LEFT RED BOX): Product Showcase (Dual Images with Wishlist & Share) */}
        <div className="md:col-span-7 flex flex-col justify-between gap-3">
          {images.length >= 2 ? (
            <div className="grid grid-cols-2 gap-2.5 relative">
              <div className="aspect-[3/4] sm:aspect-[4/5] rounded-2xl border border-slate-200 bg-[#f8f9fa] sm:bg-white p-3 flex items-center justify-center overflow-hidden">
                <img
                  src={selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER}
                  alt={product.name}
                  onError={onProductImageError}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                />
              </div>
              <div className="aspect-[3/4] sm:aspect-[4/5] rounded-2xl border border-slate-200 bg-[#f8f9fa] sm:bg-white p-3 flex items-center justify-center overflow-hidden relative">
                <img
                  src={images[1] || images[0] || PRODUCT_IMAGE_PLACEHOLDER}
                  alt={product.name}
                  onError={onProductImageError}
                  className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
                />

                {/* Floating Wishlist Heart & Share Buttons */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                  <button
                    type="button"
                    onClick={handleToggleWishlist}
                    className={`p-2 rounded-full shadow-md bg-white border border-slate-200 transition-colors ${
                      isWished ? "text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-slate-600"
                    }`}
                    title={isWished ? "Remove from wishlist" : "Add to wishlist"}
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    className="p-2 rounded-full shadow-md bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Share product"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-[#f8f9fa] sm:bg-white p-4 flex items-center justify-center overflow-hidden">
              <img
                src={selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER}
                alt={product.name}
                onError={onProductImageError}
                className="max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105"
              />
              <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  className={`p-2 rounded-full shadow-md bg-white border border-slate-200 transition-colors ${
                    isWished ? "text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-slate-600"
                  }`}
                  title={isWished ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 rounded-full shadow-md bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Share product"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Thumbnail preview slider */}
          {images.length > 2 && (
            <div className="flex gap-2 overflow-x-auto pb-0.5 pt-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-14 h-14 rounded-lg border p-1 bg-white shrink-0 overflow-hidden transition-all ${
                    selectedImage === img ? "border-slate-900 ring-2 ring-slate-900/10 shadow-2xs" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <img src={img} alt="" onError={onProductImageError} className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2 (RIGHT RED BOX): Flipkart-Identical 4-Block Configuration */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3">
          {/* Block 1: Top Brand / Product Ad Strip with Thumbnail */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between shadow-2xs relative overflow-hidden">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-black text-[#212121] tracking-wider uppercase">
                {product.brand || "BOLTT"}
              </span>
              <span className="text-slate-300">|</span>
              <div className="text-xs text-[#212121]">
                <span className="font-semibold">{product.name}</span>
                <span className="block text-2xs text-[#878787]">Starting From {formatINR(price)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <img
                src={selectedImage || images[0] || PRODUCT_IMAGE_PLACEHOLDER}
                alt=""
                onError={onProductImageError}
                className="w-8 h-10 object-contain"
              />
              <span className="text-3xs text-slate-400 border border-slate-200 rounded px-1 self-start font-medium">Ad</span>
            </div>
          </div>

          {/* Block 2: Selected Color (Flipkart-style 3:4 Thumbnail Swatches) */}
          {variants.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-normal text-[#878787]">
                Selected Color: <span className="font-bold text-[#212121]">{activeColor || activeVariantLabel}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {variants.map((v, idx) => {
                  const isSelected = String(v._id) === String(selectedVariantId);
                  const vImg = v.image || images[idx] || images[0] || PRODUCT_IMAGE_PLACEHOLDER;
                  const vColor = v.attributes?.Color || v.attributes?.color || Object.values(v.attributes || {})[0] || v.name;

                  return (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v._id);
                        if (v.image || images[idx]) setSelectedImage(v.image || images[idx]);
                      }}
                      className={`w-12 h-16 sm:w-14 sm:h-18 rounded-lg p-1 bg-white flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? "border-2 border-[#212121] shadow-xs ring-1 ring-[#212121]/15"
                          : "border border-[#e0e0e0] hover:border-slate-400"
                      }`}
                      title={String(vColor)}
                    >
                      <img src={vImg} alt="" onError={onProductImageError} className="max-h-full max-w-full object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Block 3: Variant (Flipkart-style Compact Spec + Discount + Price Cards) */}
          {variants.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <div className="text-xs font-normal text-[#878787]">
                Variant: <span className="font-bold text-[#212121]">{activeVariantLabel}</span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {variants.map((v) => {
                  const isSelected = String(v._id) === String(selectedVariantId);
                  const vLabel = Object.entries(v.attributes || {}).map(([, val]) => String(val)).join(" + ") || v.name || v.sku;
                  const vPrice = v.price || price;
                  const vMrp = v.mrp || (product.mrp && product.mrp > vPrice ? product.mrp : Math.round(vPrice * 1.35));
                  const vDiscount = vMrp > vPrice ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;

                  return (
                    <button
                      key={v._id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v._id);
                        if (v.image) setSelectedImage(v.image);
                      }}
                      className={`w-32 sm:w-36 rounded-lg p-2.5 text-left transition-all flex flex-col justify-between shrink-0 ${
                        isSelected
                          ? "border-2 border-[#212121] bg-white shadow-2xs"
                          : "border border-[#e0e0e0] hover:border-slate-400 bg-white"
                      }`}
                    >
                      <span className="text-xs font-bold text-[#212121] truncate block">{vLabel}</span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-2xs">
                        {vDiscount > 0 && (
                          <span className="font-bold text-[#388e3c]">↓{vDiscount}%</span>
                        )}
                        <span className="text-[#878787] line-through">{formatINR(vMrp)}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[#212121] mt-0.5 block">{formatINR(vPrice)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Block 4: Bottom Action Box with Title, In-line Quantity, Cart Icon, EMI Button, and Yellow Buy Now */}
          <div className="border border-[#e0e0e0] rounded-xl p-3 bg-white shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <h4 className="text-xs sm:text-sm font-bold text-[#212121] truncate">
                {product.brand ? `${product.brand} ` : ""}{product.name} {activeVariantLabel ? `(${activeVariantLabel})` : ""}
              </h4>

              {/* In-line compact quantity stepper */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center border border-slate-300 rounded bg-white shadow-2xs">
                  <button
                    type="button"
                    disabled={updatingCartQty}
                    onClick={isCurrentVariantInCart ? handleDecrementCartQty : () => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="px-2 py-0.5 text-xs font-bold text-slate-900 min-w-[20px] text-center">
                    {isCurrentVariantInCart ? (updatingCartQty ? "..." : currentCartQty) : quantity}
                  </span>
                  <button
                    type="button"
                    disabled={updatingCartQty || (isCurrentVariantInCart ? currentCartQty >= maxStock : quantity >= maxStock)}
                    onClick={isCurrentVariantInCart ? handleIncrementCartQty : () => setQuantity((q) => Math.min(maxStock, q + 1))}
                    className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-xs font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Cart Icon Button */}
              <button
                type="button"
                onClick={isCurrentVariantInCart ? () => navigate("/cart") : handleAddToCart}
                disabled={!inStock || addingToCart}
                className="w-11 h-11 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors flex items-center justify-center shrink-0 relative text-slate-700 shadow-2xs"
                title={isCurrentVariantInCart ? "View in Cart" : "Add to Cart"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {isCurrentVariantInCart && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-3xs font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {currentCartQty}
                  </span>
                )}
              </button>

              {/* Middle Button: Add to Cart / Buy with EMI */}
              <button
                type="button"
                onClick={isCurrentVariantInCart ? () => navigate("/cart") : handleAddToCart}
                disabled={!inStock || addingToCart}
                className="flex-1 h-11 px-3 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors text-left flex flex-col justify-center leading-tight shadow-2xs"
              >
                <span className="text-xs sm:text-sm font-bold text-[#212121]">
                  {isCurrentVariantInCart ? "Go to Cart" : "Buy with EMI"}
                </span>
                <span className="text-2xs text-[#878787] font-medium">
                  {isCurrentVariantInCart ? `${currentCartQty} in cart` : `From ${formatINR(emiAmount)}/m`}
                </span>
              </button>

              {/* Right Primary Button: Flipkart Signature Yellow "Buy now at ₹{price}" */}
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!inStock}
                className="px-5 sm:px-6 h-11 rounded-lg bg-[#ffc200] hover:bg-[#f5b800] disabled:opacity-50 text-[#212121] font-bold flex flex-col items-center justify-center shrink-0 leading-tight shadow-2xs transition-colors"
              >
                <span className="text-xs sm:text-sm font-bold">Buy now</span>
                <span className="text-2xs font-semibold text-[#212121]">at {formatINR(price)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Reviews & Description below the hero section */}
      <div className="mt-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        {/* Description & Policies */}
        <div className="pb-4 border-b border-slate-100">
          <h3 className="text-xs font-bold text-[#212121] uppercase tracking-wide mb-1.5">Description</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-3">{product.description}</p>
          <div className="flex items-center flex-wrap gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> 7 Days Replacement Policy</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Cash on Delivery available</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Free Delivery on orders above ₹5,000</span>
          </div>
        </div>

        {/* Specifications & Reviews tabs */}
        <div className="pt-4">
          <div className="flex border-b border-slate-200 gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
                activeTab === "specs" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Specifications
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`pb-2.5 text-sm font-bold border-b-2 transition-colors ${
                activeTab === "reviews" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Ratings & Reviews ({reviews.length})
            </button>
          </div>

          {activeTab === "specs" && (
            <div className="py-3">
              {product.specs && Object.keys(product.specs).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                  {Object.entries(product.specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between py-1.5 border-b border-slate-100 text-xs">
                      <span className="text-slate-500 font-medium">{key}</span>
                      <span className="text-slate-800 font-semibold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-3">Standard manufacturer specifications apply for this model.</p>
              )}
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="py-3 flex flex-col gap-5">
              {user && (
                <form onSubmit={handleReviewSubmit} className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 flex flex-col gap-2.5">
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
                    rows={2}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share details of your experience with this product..."
                    required
                    className="w-full text-xs p-2 rounded border border-slate-300 bg-white"
                  />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="self-start px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No customer reviews yet. Be the first to review this product!</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reviews.map((r, i) => (
                    <div key={r._id || i} className="py-2.5 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#388e3c] text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          {r.rating || 5} ★
                        </span>
                        <span className="text-xs font-bold text-slate-800">{r.title || r.name || "Verified Buyer"}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                      <span className="text-3xs text-slate-400">Reviewed on {formatDate(r.createdAt || new Date())}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Similar products */}
      {related.length > 0 && (
        <div className="mt-5 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-3">Similar Products</h3>
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
