import { useEffect, useRef, useState } from "react";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage.js";
import { mediaKey } from "../utils/variantMedia.js";

// The product page gallery: one large photo with a thumbnail strip underneath.
//
// The photos passed in are already narrowed to the selected variant, so this
// component only has to decide which of them is showing. It tracks the photo by
// URL rather than by position, which gives the right behaviour on both kinds of
// variant change for free:
//
//   Sierra Blue -> Graphite   the list changes entirely, so fall back to the
//                             first photo of the new colour
//   128 GB -> 512 GB          the list is identical (storage does not change
//                             how the phone looks), so the view stays put
//                             instead of jumping back to the first photo

const SIZES = "(min-width: 1024px) 480px, (min-width: 640px) 60vw, 100vw";

const GalleryImage = ({ item, alt, eager, className, sizes, boxSize }) => {
  const width = item.width || boxSize;
  const height = item.height || boxSize;

  const img = (
    <img
      src={item.url}
      srcSet={item.srcset || undefined}
      sizes={item.srcset ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      // The hero is the page's largest paint; the thumbnails can wait.
      fetchpriority={eager ? "high" : "low"}
      decoding="async"
      onError={onProductImageError}
      className={className}
    />
  );

  // Only wrap in <picture> when we actually generated an AVIF set. Cloudinary
  // and admin-uploaded images have no derivatives and fall back to a plain img.
  if (!item.srcsetAvif) {
    return img;
  }

  return (
    <picture>
      <source type="image/avif" srcSet={item.srcsetAvif} sizes={sizes} />
      {item.srcset && <source type="image/webp" srcSet={item.srcset} sizes={sizes} />}
      {img}
    </picture>
  );
};

const ProductGallery = ({ media, alt, overlay, actions, selectionLabel }) => {
  const items = media || [];
  const [activeUrl, setActiveUrl] = useState(items[0]?.url || null);
  const lastKey = useRef(mediaKey(items));

  // When the shopper picks a different variant the photo set changes underneath
  // us. Keep showing the same photo if it is still in the new set, otherwise
  // start again at the first one.
  useEffect(() => {
    const key = mediaKey(items);
    if (key === lastKey.current) {
      return;
    }
    lastKey.current = key;

    const stillThere = items.some((item) => item.url === activeUrl);
    if (!stillThere) {
      setActiveUrl(items[0]?.url || null);
    }
  }, [items, activeUrl]);

  const active = items.find((item) => item.url === activeUrl) || items[0] || null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-sm border border-ink-100 bg-white p-6">
        {actions && <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">{actions}</div>}

        {active ? (
          <GalleryImage
            item={active}
            alt={alt}
            eager
            sizes={SIZES}
            boxSize={800}
            className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
          />
        ) : (
          // This configuration has no photo of its own yet. We deliberately do
          // not borrow another colour's photo, so say so plainly instead of
          // showing an empty box.
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <img
              src={PRODUCT_IMAGE_PLACEHOLDER}
              alt=""
              width="120"
              height="120"
              className="h-28 w-28 opacity-40"
            />
            <p className="text-sm text-ink-500">
              No photo yet for this option
              {selectionLabel ? ` (${selectionLabel})` : ""}.
            </p>
          </div>
        )}

        {overlay}
      </div>

      {items.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const selected = item.url === active?.url;
            return (
              <button
                key={item.url}
                type="button"
                aria-label={`Show image ${items.indexOf(item) + 1} of ${items.length}`}
                aria-pressed={selected}
                onMouseEnter={() => setActiveUrl(item.url)}
                onClick={() => setActiveUrl(item.url)}
                className={`h-16 w-16 overflow-hidden rounded-sm border bg-white p-1 transition-all ${
                  selected
                    ? "border-accent-500 ring-2 ring-accent-200"
                    : "border-ink-200 hover:border-ink-400"
                }`}
              >
                <GalleryImage
                  item={item}
                  alt=""
                  sizes="64px"
                  boxSize={64}
                  className="h-full w-full object-contain"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
