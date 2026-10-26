// Product card component rendering grid/list representations.
// Supports image hover transitions, wishlist toggling, and quick cart mutation.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatINR } from "../utils/formatUtils.js";
import { useCart } from "../context/cartContext.jsx";
import { useAuth } from "../context/authContext.jsx";
import { useToast } from "../context/toastContext.jsx";
import CartQuantity, { findCartLine } from "./cartQuantity.jsx";
import { IconCart, IconHeart, IconStar } from "./icons.jsx";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImageUtils.js";

const ProductCard = ({ product, showBrand = true }) => {
  const { cart, addToCart, addToWishlist, removeFromWishlist, inWishlist, openDrawer: openCartDrawer } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const isWished = inWishlist(product._id);
  const stock = product.countInStock;
  const inCart = !!findCartLine(cart, product._id);

  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      await addToCart(product._id, 1);
      openCartDrawer();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setAdding(false);
    }
  };

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

  const outOfStock = stock === 0;

  return (
    <div className="bg-white rounded-xs border border-slate-200 p-3 sm:p-4 flex flex-col justify-between hover:shadow-md transition-shadow group">
      <div>
        <div className="relative aspect-square overflow-hidden bg-white p-2 sm:p-3 flex items-center justify-center">
          <Link to={`/products/${product._id}`} className="block h-full w-full">
            <img
              src={image}
              alt={product.name}
              loading="lazy"
              onError={onProductImageError}
              className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Wishlist toggle button */}
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
            className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-ink-600 shadow-xs backdrop-blur-xs transition hover:bg-white hover:text-copper-600 focus:outline-hidden"
          >
            <IconHeart size={16} filled={isWished} className={isWished ? "text-copper-600" : ""} />
          </button>

          {/* Out of Stock and low stock overlay indicators */}
          {outOfStock ? (
            <span className="badge badge-subtle absolute bottom-2 left-2 text-[10px] sm:text-xs">
              Out of stock
            </span>
          ) : stock <= 5 ? (
            <span className="badge badge-warning absolute bottom-2 left-2 text-[10px] sm:text-xs">
              Only {stock} left
            </span>
          ) : null}
        </div>

        <div className="pt-2.5">
          {showBrand && product.brand && (
            <span className="brand-label text-[10px] sm:text-xs">{product.brand}</span>
          )}

          <h3 className="line-clamp-2 text-xs sm:text-sm font-medium text-ink-900 group-hover:text-copper-600">
            <Link to={`/products/${product._id}`}>{product.name}</Link>
          </h3>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center gap-2">
          {product.rating > 0 && (
            <div className="rating-pill text-[10px] sm:text-xs">
              <span>{product.rating.toFixed(1)}</span>
              <IconStar size={10} />
            </div>
          )}
          {product.numReviews > 0 && (
            <span className="text-[10px] sm:text-xs text-ink-500">
              ({product.numReviews})
            </span>
          )}
          {product.rating >= 4.5 && (
            <span className="rounded-xs bg-brand-50 px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold text-brand-700">
              Assured
            </span>
          )}
        </div>
        <div className="price-row mt-0.5 gap-1.5">
          <span className="text-sm sm:text-lg font-bold text-ink-900">{formatINR(product.price)}</span>
          {discount > 0 && (
            <>
              <span className="price-mrp text-[10px] sm:text-xs">{formatINR(product.mrp)}</span>
              <span className="price-off text-[10px] sm:text-xs">{discount}% off</span>
            </>
          )}
        </div>
        <span className="text-[11px] sm:text-xs font-medium text-success">Free delivery</span>

        {!outOfStock && (
          <div className="pointer-events-auto relative z-20 mt-2">
            {inCart ? (
              <CartQuantity
                productId={product._id}
                max={stock}
                variant="button"
              />
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding}
                className="btn btn-cart btn-sm w-full h-8 sm:h-9 gap-1.5"
              >
                <IconCart size={14} />
                {adding ? "Adding..." : "Add to cart"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
