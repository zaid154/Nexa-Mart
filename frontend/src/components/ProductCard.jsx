import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Rating from "./Rating.jsx";
import { formatINR } from "../utils/format.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage.js";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { IconCart, IconHeart } from "./Icons.jsx";
import CartQuantity, { findCartLine } from "./CartQuantity.jsx";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";
import { variantLabel } from "../utils/variantMedia.js";

// One product box shown in the product grid. The whole tile is a link to the
// product page; the wishlist heart and the cart control sit above it.
const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { cart, addToCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();
  const { open: openCartDrawer } = useCartDrawer();
  const toast = useToast();
  const navigate = useNavigate();

  const isWished = inWishlist(product._id);

  // A grid has no variant picker, so a variant product is added in its default
  // configuration — the same one the product page pre-selects, so the tile and
  // the product page always land on the same cart line rather than creating
  // two. The chosen configuration is named under the button so nobody is
  // surprised by what turns up in the cart.
  const defaultVariant = product.variants?.[0] || null;
  const variantId = defaultVariant?._id || null;
  const defaultVariantLabel = variantLabel(defaultVariant);
  const stock = defaultVariant ? defaultVariant.countInStock : product.countInStock;

  const inCart = !!findCartLine(cart, product._id, variantId);

  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      await addToCart(product._id, 1, variantId);
      // The drawer is the confirmation. A toast as well would put two messages
      // in opposite corners of the screen for one action.
      openCartDrawer();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAdding(false);
    }
  };
  // A grid has no variant selection, so the first photo — the default
  // configuration — is the right one to show.
  const cover = product.media?.[0];
  const image = cover?.url || product.images?.[0] || PRODUCT_IMAGE_PLACEHOLDER;

  let discount = 0;
  if (product.mrp > product.price) {
    discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  }

  const handleWishlist = async () => {
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

  const outOfStock = product.countInStock === 0;

  let wishlistTitle = "Add to wishlist";
  if (isWished) {
    wishlistTitle = "Remove from wishlist";
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-sm bg-white transition-shadow duration-200 hover:shadow-pop">
      <Link to={`/products/${product._id}`} className="absolute inset-0 z-10">
        <span className="sr-only">{product.name}</span>
      </Link>

      <div className="pointer-events-none relative aspect-[4/3] overflow-hidden bg-white">
        <img
          src={image}
          srcSet={cover?.srcset || undefined}
          sizes={cover?.srcset ? "(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw" : undefined}
          alt={product.name}
          // Intrinsic size reserves the box so the grid does not jump as
          // images arrive.
          width={cover?.width || 400}
          height={cover?.height || 400}
          loading="lazy"
          decoding="async"
          onError={onProductImageError}
          className={`h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.04] ${
            outOfStock ? "opacity-50" : ""
          }`}
        />
        {outOfStock && (
          <span className="absolute inset-0 z-[5] grid place-items-center">
            <span className="rounded-sm bg-ink-900/85 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-white">
              Out of stock
            </span>
          </span>
        )}
        <button
          type="button"
          className={`pointer-events-auto absolute right-2.5 top-2.5 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/95 shadow-sm transition-colors hover:text-danger ${
            isWished ? "text-danger" : "text-ink-300"
          }`}
          onClick={handleWishlist}
          title={wishlistTitle}
          aria-label={wishlistTitle}
        >
          <IconHeart size={16} filled={isWished} />
        </button>
      </div>

      <div className="pointer-events-none flex flex-1 flex-col gap-1.5 px-4 pb-4 pt-1">
        <span className="line-clamp-2 min-h-[38px] text-sm font-medium leading-snug text-ink-900">
          {product.name}
        </span>
        <span className="text-xs text-ink-400">{product.brand}</span>
        <div className="flex items-center gap-2">
          <Rating value={product.rating} count={product.numReviews} />
          {product.rating >= 4 && (
            <span className="text-2xs font-bold uppercase tracking-wide text-accent-500">
              Assured
            </span>
          )}
        </div>
        <div className="price-row mt-0.5">
          <span className="text-lg font-bold text-ink-900">{formatINR(product.price)}</span>
          {discount > 0 && (
            <>
              <span className="price-mrp">{formatINR(product.mrp)}</span>
              <span className="price-off">{discount}% off</span>
            </>
          )}
        </div>
        <span className="text-xs font-medium text-success">Free delivery</span>

        {/* The tile body is pointer-events-none under a full-bleed link, so the
            cart control has to opt back in and sit above it. */}
        {!outOfStock && (
          <div className="pointer-events-auto relative z-20 mt-2">
            {inCart ? (
              <div className="flex items-center justify-between gap-2 rounded-sm border border-copper-100 bg-copper-50 px-2 py-1.5">
                <span className="text-xs font-semibold text-copper-600">In cart</span>
                <CartQuantity
                  productId={product._id}
                  variantId={variantId}
                  max={stock}
                  size="sm"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding}
                className="btn btn-cart btn-sm w-full gap-1.5"
              >
                <IconCart size={14} />
                {adding ? "Adding..." : "Add to cart"}
              </button>
            )}
            {defaultVariantLabel && (
              <p className="mt-1 truncate text-center text-2xs text-ink-400">
                {defaultVariantLabel}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
