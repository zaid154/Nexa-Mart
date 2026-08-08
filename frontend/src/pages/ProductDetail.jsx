import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../api/client.js";
import ErrorState from "../components/ErrorState.jsx";
import { SkeletonDetail } from "../components/Skeleton.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { formatINR, formatDate } from "../utils/format.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  IconHeart,
  IconCart,
  IconMapPin,
  IconTag,
  IconZap,
  iconByName,
} from "../components/Icons.jsx";
import { useSettings, useCommerce } from "../context/SettingsContext.jsx";
import { deliveryEstimate } from "../utils/pricing.js";
import ProductGallery from "../components/ProductGallery.jsx";
import VariantPicker from "../components/VariantPicker.jsx";
import { mediaForVariant, mediaFromProduct } from "../utils/variantMedia.js";
import QuantityStepper from "../components/QuantityStepper.jsx";
import CartQuantity from "../components/CartQuantity.jsx";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";

// The "Available offers" list and the service badges are configured in
// Admin → Settings → Storefront; this page just renders whatever is saved.

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const commerce = useCommerce();
  const offers = settings.productPage.offers || [];
  const serviceBadges = settings.productPage.serviceBadges || [];
  const { cart, addToCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();
  const { open: openCartDrawer } = useCartDrawer();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [showAllOffers, setShowAllOffers] = useState(false);
  // _id of the chosen configuration. Tracking the id rather than a position
  // means a reordered variants array cannot silently change the selection.
  const [variantId, setVariantId] = useState(null);

  const [activeTab, setActiveTab] = useState("specifications");
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState(null);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  const load = (signal) => {
    setLoading(true);
    setError("");
    api
      .get(`/products/${id}`, { signal })
      .then((res) => {
        setProduct(res.data.product);
        setReviews(res.data.reviews || []);

        // Related products are a separate, lower-priority request. It used to
        // be chained inside this .then(), so the page waited for two round
        // trips in a row before anything below the fold appeared.
        if (res.data.product?.category) {
          api
            .get("/products", {
              params: { category: res.data.product.category, limit: 5 },
              signal,
            })
            .then((r) => {
              const others = (r.data.products || []).filter((p) => p._id !== res.data.product._id);
              setRelated(others.slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        // Navigating away mid-flight is not an error worth reporting.
        if (err.code === "ERR_CANCELED") {
          return;
        }
        setError(err.message);
        toast.error(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    setQty(1);
    setVariantId(null);
    setPincodeStatus(null);
    setShowAllOffers(false);
    setActiveTab("specifications");
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <SkeletonDetail />;
  }
  if (error) {
    return <ErrorState title="Failed to load product" message={error} onRetry={() => load()} />;
  }
  if (!product) {
    return (
      <div className="card mx-auto flex w-full max-w-md flex-col items-center gap-3 px-8 py-14 text-center">
        <span className="eyebrow">Product</span>
        <p className="font-display text-lg font-semibold text-ink-900">Not found</p>
        <p className="-mt-1 text-sm text-ink-500">This product could not be found.</p>
        <Link to="/products" className="btn">Browse products</Link>
      </div>
    );
  }

  const wished = inWishlist(product._id);
  const specs = product.specs || {};
  const attributes = product.attributes || {};

  // The chosen configuration drives price and stock. Products without
  // variants simply fall back to their own price and stock.
  const variants = product.variants || [];
  const variant = variants.find((v) => v._id === variantId) || variants[0] || null;
  const selectedVariantId = variant?._id || null;

  // The photos for this exact configuration. Switching colour swaps the list;
  // switching storage leaves it alone, because storage does not change how the
  // product looks.
  const galleryMedia = mediaForVariant(mediaFromProduct(product), variant?.attributes);

  const inCart = cart.items.some(
    (item) =>
      item.product?._id === product._id &&
      String(item.variant?._id || "") === String(selectedVariantId || "")
  );

  const stock = variant ? variant.countInStock : product.countInStock || 0;
  const outOfStock = stock === 0;
  const lowStock = stock > 0 && stock < (commerce.lowStockThreshold ?? 10);

  // Price comes from the variant; the MRP discount ratio is kept from the
  // product so a pricier configuration shows a consistent saving.
  const price = variant?.price ?? product.price;
  const baseMrp = product.mrp > product.price ? product.mrp : 0;
  const mrp = baseMrp ? Math.round(price * (baseMrp / product.price)) : 0;
  const discount = mrp ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const emiAmount = Math.round(price / (commerce.emiMonths || 12));
  const isAssured = product.rating >= (commerce.assuredMinRating ?? 4);

  // The attribute names this product varies on, e.g. ["Storage", "Color"].
  // Taken across every variant, not just the first — the MateBook adds a Color
  // key on only one of its three configurations.
  const variantKeys = [
    ...new Set(variants.flatMap((v) => Object.keys(v.attributes || {}))),
  ];

  // Ratings summary computed from the actual reviews.
  const ratingCounts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );
  const maxCount = Math.max(1, ...ratingCounts);

  const handleAdd = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(product._id, qty, selectedVariantId);
      // The drawer is the confirmation; a toast as well would say the same
      // thing twice, in the opposite corner of the screen.
      openCartDrawer();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(product._id, qty, selectedVariantId);
      navigate("/checkout");
    } catch (err) {
      toast.error(err.message);
    }
  };

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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleCheckPincode = (e) => {
    e.preventDefault();
    if (!pincode || pincode.length < 6) {
      toast.error("Enter a valid 6-digit PIN code");
      return;
    }
    setPincodeStatus({
      text: `Delivery by ${deliveryEstimate(commerce)}`,
      free: true,
    });
  };

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

  const visibleOffers = showAllOffers ? offers : offers.slice(0, 3);
  const hiddenOfferCount = offers.length - 3;

  return (
    <div className="flex animate-fade-in flex-col gap-3">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-ink-500">
        <Link to="/" className="hover:text-accent-500">Home</Link>
        <span>/</span>
        <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-accent-500">
          {product.category}
        </Link>
        <span>/</span>
        <span className="max-w-[280px] truncate font-semibold text-ink-800">{product.name}</span>
      </div>

      {/* Main product card */}
      <div className="rounded-sm bg-white p-4 shadow-card sm:p-6">
        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* ── Left: sticky gallery + action buttons ── */}
          <div className="lg:col-span-5">
            <div className="flex flex-col gap-3 lg:sticky lg:top-24">
              <ProductGallery
                media={galleryMedia}
                alt={product.name}
                selectionLabel={Object.values(variant?.attributes || {}).join(", ")}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={handleWishlist}
                      className={`grid h-9 w-9 place-items-center rounded-full bg-white shadow-md transition-transform hover:scale-110 ${
                        wished ? "text-danger" : "text-ink-400 hover:text-danger"
                      }`}
                      title={wished ? "Remove from Wishlist" : "Save to Wishlist"}
                    >
                      <IconHeart size={18} filled={wished} />
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink-500 shadow-md transition-transform hover:scale-110 hover:text-accent-500"
                      title="Share Product"
                    >
                      ↗
                    </button>
                  </>
                }
                overlay={
                  outOfStock ? (
                    <span className="absolute left-3 top-3 rounded-sm bg-ink-900/85 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-white">
                      Out of stock
                    </span>
                  ) : null
                }
              />

              {/* Action buttons live under the gallery, marketplace-style.
                  Once the item is in the cart the amber button flips to
                  "Go to Cart" so the shopper always knows it worked. */}
              <div className="flex items-stretch gap-3 pt-1">
                {inCart ? (
                  <button
                    type="button"
                    onClick={() => navigate("/cart")}
                    className="btn btn-cart flex-1 gap-2 py-3.5 text-sm"
                  >
                    <IconCart size={17} />
                    Go to Cart
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={outOfStock}
                    className="btn btn-cart flex-1 gap-2 py-3.5 text-sm"
                  >
                    <IconCart size={17} />
                    Add to Cart
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={outOfStock}
                  className="btn btn-buy flex-1 gap-2 py-3.5 text-sm"
                >
                  <IconZap size={17} />
                  Buy Now
                </button>
              </div>
              {inCart && (
                <div className="flex items-center justify-center gap-3 rounded-sm border border-copper-100 bg-copper-50 px-3 py-2">
                  <span className="text-xs font-semibold text-copper-600">In your cart</span>
                  {/* Bound to the real cart line, not the local counter above.
                      That counter never changed after an add, which is what
                      made a second Add look like it had done nothing while it
                      quietly doubled the line. */}
                  <CartQuantity
                    productId={product._id}
                    variantId={selectedVariantId}
                    max={stock}
                    size="md"
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Right: info column ── */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            {/* Brand, title, rating */}
            <div>
              <Link
                to={`/products?brand=${encodeURIComponent(product.brand)}`}
                className="text-xs font-bold text-accent-500 hover:underline"
              >
                Visit {product.brand} store
              </Link>
              <h1 className="mt-1 text-lg font-medium leading-snug text-ink-900 sm:text-xl">
                {product.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                {product.rating > 0 && (
                  <>
                    <span className="rating-pill">{product.rating.toFixed(1)} ★</span>
                    <span className="text-sm font-medium text-ink-400">
                      {product.numReviews} Ratings &amp; {reviews.length} Reviews
                    </span>
                  </>
                )}
                {isAssured && (
                  <span className="rounded-sm bg-accent-50 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-accent-600">
                    {settings.site.name} Assured
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div>
              {discount > 0 && (
                <p className="text-sm font-medium text-success">Special price</p>
              )}
              <div className="price-row mt-0.5">
                <span className="text-3xl font-medium text-ink-900">{formatINR(price)}</span>
                {discount > 0 && (
                  <>
                    <span className="price-mrp text-base">{formatINR(mrp)}</span>
                    <span className="price-off text-base">{discount}% off</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-500">
                No Cost EMI from{" "}
                <span className="font-semibold text-ink-800">₹{emiAmount.toLocaleString()}/month</span>
                {" "}· Free delivery
              </p>
              {lowStock && (
                <p className="mt-1.5 text-sm font-semibold text-danger">
                  Hurry, only {stock} left!
                </p>
              )}
            </div>

            {/* Available offers */}
            {offers.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-ink-900">Available offers</h3>
                <ul className="space-y-2">
                  {visibleOffers.map((offer) => (
                    <li key={offer.label} className="flex items-start gap-2.5 text-sm text-ink-800">
                      <span className="mt-0.5 shrink-0 text-success" aria-hidden="true">
                        <IconTag size={15} />
                      </span>
                      <span>
                        <strong className="font-semibold">{offer.label}</strong>{" "}
                        <span className="text-ink-600">{offer.text}</span>{" "}
                        <button type="button" className="font-semibold text-accent-500 hover:underline">
                          T&amp;C
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                {hiddenOfferCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllOffers((s) => !s)}
                    className="mt-2 text-sm font-semibold text-accent-500 hover:underline"
                  >
                    {showAllOffers
                      ? "Show less"
                      : `View ${hiddenOfferCount} more offer${hiddenOfferCount > 1 ? "s" : ""}`}
                  </button>
                )}
              </div>
            )}

            {/* Configuration picker — each option carries its own price and
                stock, and is what actually gets added to the cart. */}
            {variants.length > 0 && (
              <div className="border-t border-ink-100 pt-4">
                <VariantPicker
                  variants={variants}
                  selected={variant}
                  onSelect={(next) => {
                    setVariantId(next._id);
                    setQty(1);
                  }}
                />
              </div>
            )}

            {/* Fixed product attributes that do not vary by configuration */}
            {Object.keys(attributes).length > 0 && (
              <div className="flex flex-col gap-2">
                {Object.entries(attributes)
                  .filter(([key]) => !variantKeys.includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-4 text-sm">
                      <span className="w-24 shrink-0 text-ink-400">{key}</span>
                      <span className="font-medium text-ink-900">{value}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Quantity — how many to add. Once the item is in the cart this
                row steps aside for the cart-bound stepper under the buttons,
                so there are never two numbers on screen disagreeing. */}
            {!inCart && (
              <div className="flex items-center gap-4 text-sm">
                <span className="w-24 shrink-0 text-ink-400">Quantity</span>
                <QuantityStepper
                  value={qty}
                  min={1}
                  max={Math.max(stock, 1)}
                  onChange={setQty}
                  size="md"
                />
              </div>
            )}

            {/* Delivery pincode */}
            <div className="flex items-start gap-4 text-sm">
              <span className="w-24 shrink-0 pt-1.5 text-ink-400">Delivery</span>
              <div className="min-w-0">
                <form onSubmit={handleCheckPincode} className="flex items-center gap-1 border-b-2 border-accent-500 pb-1">
                  <IconMapPin size={15} className="shrink-0 text-accent-500" />
                  <input
                    type="text"
                    placeholder="Enter delivery pincode"
                    value={pincode}
                    maxLength={6}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-40 border-0 bg-transparent px-1 text-sm font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 focus:outline-none"
                  />
                  <button type="submit" className="shrink-0 text-sm font-semibold text-accent-500 hover:underline">
                    Check
                  </button>
                </form>
                {pincodeStatus ? (
                  <p className="mt-1.5 text-sm text-ink-800">
                    <span className="font-semibold">{pincodeStatus.text}</span>{" "}
                    <span className="font-semibold text-success">| Free</span>{" "}
                    <span className="text-xs text-ink-400 line-through">₹40</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-ink-400">
                    Enter pincode for exact delivery dates and charges
                  </p>
                )}
              </div>
            </div>

            {/* Seller */}
            {commerce.sellerName && (
              <div className="flex items-start gap-4 text-sm">
                <span className="w-24 shrink-0 text-ink-400">Seller</span>
                <div>
                  <p className="font-semibold text-accent-500">
                    {commerce.sellerName}{" "}
                    <span className="ml-1 rounded-sm bg-accent-50 px-1.5 py-0.5 text-2xs font-bold uppercase tracking-wide text-accent-600">
                      Assured
                    </span>
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-ink-500">
                    {commerce.returnWindowDays > 0 && (
                      <li>{commerce.returnWindowDays} day replacement policy</li>
                    )}
                    <li>GST invoice available</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Services strip */}
            {serviceBadges.length > 0 && (
              <div className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-4 sm:grid-cols-4">
                {serviceBadges.map((badge) => {
                  const Icon = iconByName(badge.icon);
                  return (
                    <div key={badge.text} className="flex flex-col items-center gap-1.5 text-center">
                      <span className="text-accent-500">
                        <Icon size={22} />
                      </span>
                      <span className="text-[11px] font-medium leading-tight text-ink-600">
                        {badge.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Highlights from the catalogue */}
            {product.benefits?.length > 0 && (
              <div className="flex items-start gap-4 border-t border-ink-100 pt-4 text-sm">
                <span className="w-24 shrink-0 text-ink-400">Highlights</span>
                <ul className="list-inside list-disc space-y-1 text-sm text-ink-700">
                  {product.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Specifications / Description / Reviews */}
      <div className="rounded-sm bg-white p-4 shadow-card sm:p-6">
        <div className="flex gap-6 border-b border-ink-100" role="tablist">
          {["specifications", "description", "reviews"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`-mb-px border-b-2 pb-2.5 text-sm font-bold capitalize transition-colors ${
                activeTab === tab
                  ? "border-accent-500 text-accent-500"
                  : "border-transparent text-ink-400 hover:text-ink-700"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab} {tab === "reviews" && `(${reviews.length})`}
            </button>
          ))}
        </div>

        {activeTab === "specifications" && (
          <div className="mt-4">
            <div className="divide-y divide-ink-100 rounded-sm border border-ink-100">
              {Object.entries({
                Brand: product.brand,
                Model: product.name,
                ...attributes,
                ...(variant?.attributes || {}),
                ...(variant?.sku ? { SKU: variant.sku } : {}),
                ...specs,
              }).map(
                ([key, value]) => (
                  <div key={key} className="flex px-4 py-2.5 text-xs sm:text-sm">
                    <span className="w-1/3 text-ink-500">{key}</span>
                    <span className="w-2/3 text-ink-900">{value}</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {activeTab === "description" && (
          <div className="mt-4 text-sm leading-relaxed text-ink-700">
            <p>{product.description}</p>
          </div>
        )}

        {activeTab === "reviews" && (
          <div className="mt-5">
            {/* Ratings summary */}
            <div className="mb-6 grid gap-6 sm:grid-cols-[180px_1fr]">
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                <span className="text-4xl font-medium text-ink-900">
                  {(product.rating || 0).toFixed(1)}
                  <span className="text-2xl">★</span>
                </span>
                <span className="text-xs text-ink-400">
                  {product.numReviews} Ratings &amp;
                  <br />
                  {reviews.length} Reviews
                </span>
              </div>
              <div className="max-w-sm space-y-1.5">
                {[5, 4, 3, 2, 1].map((star, idx) => (
                  <div key={star} className="flex items-center gap-2.5 text-xs text-ink-600">
                    <span className="w-6 shrink-0 font-medium">{star} ★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-full rounded-full ${star >= 3 ? "bg-success" : star === 2 ? "bg-warning" : "bg-danger"}`}
                        style={{ width: `${(ratingCounts[idx] / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-ink-400">{ratingCounts[idx]}</span>
                  </div>
                ))}
              </div>
            </div>

            {user && (
              <form className="mb-6 max-w-xl space-y-3 rounded-sm bg-ink-50 p-4" onSubmit={submitReview}>
                <h4 className="text-sm font-bold text-ink-900">Rate this product</h4>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setForm({ ...form, rating: star })}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      className={`text-2xl transition-colors ${
                        star <= form.rating ? "text-success" : "text-ink-200 hover:text-ink-400"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-medium text-ink-500">{form.rating}/5</span>
                </div>
                <textarea
                  className="textarea text-sm"
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="Description... Tell us what you liked or disliked"
                  required
                />
                <button type="submit" className="btn btn-sm" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Review"}
                </button>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="py-6 text-center text-xs text-ink-400">No customer reviews yet.</p>
            ) : (
              <div className="divide-y divide-ink-100">
                {reviews.map((r) => (
                  <div key={r._id} className="py-4">
                    <div className="flex items-center gap-2">
                      <span className="rating-pill">{r.rating} ★</span>
                      <span className="text-sm font-medium text-ink-900">{r.comment?.slice(0, 60)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-700">{r.comment}</p>
                    <p className="mt-2 text-xs text-ink-400">
                      <span className="font-semibold text-ink-500">{r.name}</span>
                      <span className="mx-1.5">·</span>
                      <span className="font-medium text-ink-500">✓ Certified Buyer</span>
                      <span className="mx-1.5">·</span>
                      {formatDate(r.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Similar Products */}
      {related.length > 0 && (
        <div className="rounded-sm bg-white p-4 shadow-card">
          <h3 className="mb-3 text-base font-bold text-ink-900">Similar Products</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
