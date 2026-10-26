import { Link, useNavigate } from "react-router-dom";
import { formatINR } from "../../utils/formatUtils.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../../utils/productImageUtils.js";

export default function ProductHero({
  product,
  activeColor,
  colorSwatches,
  selectedSwatchIndex,
  setSelectedSwatchIndex,
  primaryDisplayImage,
  secondaryDisplayImage,
  setSelectedImage,
  price,
  mrp,
  discount,
  inStock,
  maxStock,
  isWished,
  handleToggleWishlist,
  handleShare,
  isInCart,
  currentCartQty,
  quantity,
  updatingCartQty,
  handleDecrement,
  handleIncrement,
  handleAddToCart,
  handleBuyNow,
  addingToCart,
  reviewsCount,
}) {
  const navigate = useNavigate();
  const emiAmount = Math.max(199, Math.round(price / 3));

  return (
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
              ({reviewsCount} Ratings &amp; Reviews)
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
  );
}
