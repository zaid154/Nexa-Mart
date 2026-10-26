import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/apiClient.js";
import ProductCard from "./productCard.jsx";
import ProductHero from "./productDetail/ProductHero.jsx";
import ProductSpecs from "./productDetail/ProductSpecs.jsx";
import ProductReviews from "./productDetail/ProductReviews.jsx";
import { useCart } from "../context/cartContext.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import { PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImageUtils.js";

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

          {/* 2. Main Flipkart Hero Section (Fits in Viewport Without Scrolling) */}
          <ProductHero
            product={product}
            activeColor={activeColor}
            colorSwatches={colorSwatches}
            selectedSwatchIndex={selectedSwatchIndex}
            setSelectedSwatchIndex={setSelectedSwatchIndex}
            primaryDisplayImage={primaryDisplayImage}
            secondaryDisplayImage={secondaryDisplayImage}
            setSelectedImage={setSelectedImage}
            price={price}
            mrp={mrp}
            discount={discount}
            inStock={inStock}
            maxStock={maxStock}
            isWished={isWished}
            handleToggleWishlist={handleToggleWishlist}
            handleShare={handleShare}
            isInCart={isInCart}
            currentCartQty={currentCartQty}
            quantity={quantity}
            updatingCartQty={updatingCartQty}
            handleDecrement={handleDecrement}
            handleIncrement={handleIncrement}
            handleAddToCart={handleAddToCart}
            handleBuyNow={handleBuyNow}
            addingToCart={addingToCart}
            reviewsCount={reviews.length}
          />

          {/* 3. Product Specifications, Description & Customer Reviews Section (Revealed on Scroll Down) */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Left Column: Description & Specifications */}
              <div className="lg:col-span-7">
                <ProductSpecs description={product.description} specs={product.specs} />
              </div>

              {/* Right Column: Customer Reviews */}
              <div className="lg:col-span-5">
                <ProductReviews
                  reviews={reviews}
                  user={user}
                  reviewEligibility={reviewEligibility}
                  reviewForm={reviewForm}
                  setReviewForm={setReviewForm}
                  handleReviewSubmit={handleReviewSubmit}
                  submittingReview={submittingReview}
                  showReviewModal={showReviewModal}
                  setShowReviewModal={setShowReviewModal}
                />
              </div>
            </div>
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
