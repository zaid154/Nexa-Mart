import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client.js";
import { SkeletonHome } from "../components/Skeleton.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { formatINR } from "../utils/format.js";
import { onProductImageError } from "../utils/productImage.js";
import { useSettings, useCommerce } from "../context/SettingsContext.jsx";
import { IconBox, IconChevron, IconTag, iconByName } from "../components/Icons.jsx";

// Named gradients a hero slide can use. The admin picks one by name; anything
// unknown falls back to the brand blue.
const SLIDE_THEMES = {
  blue: "from-[#1a4fa8] via-[#2874f0] to-[#1e5fd0]",
  dark: "from-[#0f1c2e] via-[#172337] to-[#1a4fa8]",
  orange: "from-[#e2560f] via-[#fb641b] to-[#ff9f00]",
  green: "from-[#123524] via-[#1a4fa8] to-[#2874f0]",
};
const themeOf = (name) => SLIDE_THEMES[name] || SLIDE_THEMES.blue;

// ── 1. Top category icon strip ───────────────────────────────────────────
const CategoryStrip = ({ tiles }) => {
  if (tiles.length === 0) {
    return null;
  }
  return (
    <div className="rounded-sm bg-white p-2 shadow-card">
      <div className="rail-scroll flex items-center justify-between gap-2 overflow-x-auto px-1 py-1">
        {tiles.map((cat) => (
          <Link
            key={cat.name}
            to={cat.link || "/products"}
            className="group flex min-w-[82px] shrink-0 flex-col items-center gap-1.5 rounded-sm px-2 py-1.5 transition-transform hover:-translate-y-0.5"
          >
            <span className="h-14 w-14 overflow-hidden rounded-full border border-ink-100 bg-ink-50">
              <img
                src={cat.image}
                alt={cat.name}
                loading="lazy"
                onError={onProductImageError}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
            </span>
            <span className="whitespace-nowrap text-xs font-semibold text-ink-800 group-hover:text-accent-500">
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
};

// ── 2. Full-width hero carousel ──────────────────────────────────────────
const HeroCarousel = ({ slides }) => {
  const [active, setActive] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (total < 2) {
      return undefined;
    }
    const timer = setInterval(() => setActive((prev) => (prev + 1) % total), 5000);
    return () => clearInterval(timer);
  }, [total]);

  // Keep the index valid if the admin removes slides while the page is open.
  useEffect(() => {
    if (active >= total) {
      setActive(0);
    }
  }, [active, total]);

  if (total === 0) {
    return null;
  }

  const go = (step) => setActive((prev) => (prev + step + total) % total);

  return (
    <div className="group relative overflow-hidden rounded-sm bg-white shadow-card">
      <div className="relative h-[190px] sm:h-[240px] lg:h-[280px]">
        {slides.map((slide, idx) => {
          const gradient = themeOf(slide.theme);
          return (
            <Link
              key={`${slide.title}-${idx}`}
              to={slide.link || "/products"}
              aria-hidden={idx !== active}
              tabIndex={idx === active ? 0 : -1}
              className={`absolute inset-0 flex items-center bg-gradient-to-r ${gradient} transition-opacity duration-700 ${
                idx === active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {slide.image && (
                <span className="absolute inset-y-0 right-0 w-[55%] sm:w-[46%]">
                  <img
                    src={slide.image}
                    alt=""
                    loading={idx === 0 ? "eager" : "lazy"}
                    className="h-full w-full object-cover opacity-70 mix-blend-luminosity"
                  />
                  <span
                    className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-70`}
                    style={{
                      maskImage: "linear-gradient(to right, black 0%, transparent 70%)",
                      WebkitMaskImage: "linear-gradient(to right, black 0%, transparent 70%)",
                    }}
                  />
                </span>
              )}

              <div className="relative z-10 max-w-[62%] px-6 text-white sm:px-10">
                {slide.badge && (
                  <span className="inline-block rounded-sm bg-yellow-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-ink-900 sm:text-[11px]">
                    {slide.badge}
                  </span>
                )}
                <h2 className="mt-2.5 text-xl font-bold leading-tight sm:text-3xl lg:text-4xl">
                  {slide.title}
                </h2>
                {slide.price && (
                  <p className="mt-1 text-lg font-bold text-yellow-300 sm:text-2xl">{slide.price}</p>
                )}
                {slide.note && (
                  <p className="mt-1 hidden text-xs text-white/85 sm:block">{slide.note}</p>
                )}
                <span className="mt-3.5 inline-flex items-center gap-1 rounded-sm bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-ink-900 shadow-sm sm:text-sm">
                  Shop Now
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous banner"
            className="absolute left-0 top-1/2 z-20 hidden h-20 w-9 -translate-y-1/2 place-items-center bg-white/90 text-ink-700 shadow-pop transition-opacity group-hover:grid"
          >
            <IconChevron size={20} className="rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next banner"
            className="absolute right-0 top-1/2 z-20 hidden h-20 w-9 -translate-y-1/2 place-items-center bg-white/90 text-ink-700 shadow-pop transition-opacity group-hover:grid"
          >
            <IconChevron size={20} className="-rotate-90" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {slides.map((slide, idx) => (
              <button
                key={`dot-${slide.title}-${idx}`}
                type="button"
                onClick={() => setActive(idx)}
                aria-label={`Go to banner ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === active ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── 3. Small promo tiles under the hero ──────────────────────────────────
const PromoTiles = ({ tiles }) => {
  if (tiles.length === 0) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {tiles.map((tile) => (
        <Link
          key={tile.title}
          to={tile.link || "/products"}
          className="relative flex h-[130px] items-center overflow-hidden rounded-sm bg-footer text-white shadow-card transition-shadow hover:shadow-pop"
        >
          {tile.image && (
            <img
              src={tile.image}
              alt=""
              loading="lazy"
              onError={onProductImageError}
              className="absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-60"
            />
          )}
          <div className="relative z-10 px-5">
            <h3 className="text-base font-bold sm:text-lg">{tile.title}</h3>
            {tile.subtitle && (
              <p className="mt-0.5 text-sm font-semibold text-yellow-300">{tile.subtitle}</p>
            )}
            <span className="mt-2 inline-block text-xs font-semibold uppercase tracking-wide text-white/80">
              Explore &rsaquo;
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
};

// ── 4. Coupon strip ──────────────────────────────────────────────────────
const CouponBanner = ({ strip }) => {
  if (!strip?.enabled) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm bg-promo-band px-5 py-3.5 text-white shadow-card">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-yellow-400 text-ink-900">
          <IconTag size={19} />
        </span>
        <div>
          <p className="text-sm font-bold sm:text-base">{strip.text}</p>
          {strip.code && (
            <p className="text-xs text-white/80">
              Apply code <span className="font-bold text-yellow-300">{strip.code}</span> at checkout
            </p>
          )}
        </div>
      </div>
      {strip.ctaLabel && (
        <Link
          to={strip.ctaLink || "/products"}
          className="rounded-sm bg-yellow-400 px-4 py-1.5 text-xs font-bold text-ink-900 shadow hover:bg-yellow-300"
        >
          {strip.ctaLabel}
        </Link>
      )}
    </div>
  );
};

// ── 5. Deal card used inside the horizontal rails ────────────────────────
const DealCard = ({ product, assuredMinRating }) => {
  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex w-[165px] shrink-0 flex-col rounded-sm bg-white p-3 transition-shadow hover:shadow-pop sm:w-[185px]"
    >
      <div className="grid aspect-square place-items-center overflow-hidden bg-white">
        {product.images?.[0] ? (
          <img
            src={product.media?.[0]?.url || product.images[0]}
            srcSet={product.media?.[0]?.srcset || undefined}
            sizes={product.media?.[0]?.srcset ? "185px" : undefined}
            alt={product.name}
            width={product.media?.[0]?.width || 400}
            height={product.media?.[0]?.height || 400}
            loading="lazy"
            decoding="async"
            onError={onProductImageError}
            className="h-full w-full object-contain p-1 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <IconBox size={40} className="text-ink-200" />
        )}
      </div>
      <div className="mt-2.5">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">
          {product.brand}
        </span>
        <h4 className="line-clamp-2 min-h-[36px] text-xs font-semibold leading-snug text-ink-800 group-hover:text-accent-500">
          {product.name}
        </h4>
        {product.rating > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <span className="rating-pill">{product.rating.toFixed(1)} ★</span>
            <span className="text-[10px] text-ink-400">({product.numReviews})</span>
            {product.rating >= assuredMinRating && (
              <span className="text-[10px] font-bold uppercase text-accent-500">Assured</span>
            )}
          </div>
        )}
        <div className="price-row mt-1.5 gap-1">
          <span className="text-sm font-bold text-ink-900">{formatINR(product.price)}</span>
          {discount > 0 && (
            <>
              <span className="price-mrp text-[11px]">{formatINR(product.mrp)}</span>
              <span className="price-off text-[11px]">{discount}% off</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

// ── 6. White card section with a horizontal product rail ─────────────────
const DealRow = ({ title, to, products, assuredMinRating }) => {
  if (!products || products.length === 0) {
    return null;
  }
  return (
    <section className="overflow-hidden rounded-sm bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 sm:px-5">
        <h3 className="text-base font-bold text-ink-900 sm:text-lg">{title}</h3>
        {to && (
          <Link
            to={to}
            className="rounded-sm bg-accent-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-accent-600"
          >
            View All
          </Link>
        )}
      </div>
      <div className="rail-scroll flex gap-2.5 overflow-x-auto p-3 sm:p-4">
        {products.map((p) => (
          <DealCard key={p._id} product={p} assuredMinRating={assuredMinRating} />
        ))}
      </div>
    </section>
  );
};

// Build the catalog link a rail's "View All" button points at.
const collectionLink = (collection) => {
  if (collection.featured) {
    return "/products?featured=true";
  }
  if (collection.category) {
    return `/products?category=${encodeURIComponent(collection.category)}`;
  }
  return `/products?sort=${collection.sort || "newest"}`;
};

const Home = () => {
  const { settings } = useSettings();
  const commerce = useCommerce();
  const homepage = settings.homepage;

  // Products keyed by collection title, so a rail renders as soon as its own
  // request comes back.
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const configuredCollections = homepage.collections || [];

  useEffect(() => {
    // One request for every rail. This used to be one request per collection —
    // seven of them — and none could start until the settings round trip had
    // finished, because only then did the browser know which collections
    // existed. The server knows the collection list already, so it does the
    // whole job in a single call that starts on first render.
    const controller = new AbortController();

    setLoading(true);
    setError("");

    api
      .get("/products/collections", { signal: controller.signal })
      .then((res) => setCollections(res.data?.collections || {}))
      .catch((err) => {
        if (err.code !== "ERR_CANCELED") {
          setError(err.message || "Failed to load products");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [reloadKey]);

  if (loading) {
    return <SkeletonHome />;
  }

  return (
    <div className="flex animate-fade-in flex-col gap-3">
      {error && (
        <ErrorState
          title="Error Loading Products"
          message={error}
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      )}

      <CategoryStrip tiles={homepage.categoryTiles || []} />
      <HeroCarousel slides={homepage.heroSlides || []} />
      <PromoTiles tiles={homepage.promoTiles || []} />
      <CouponBanner strip={homepage.couponStrip} />

      {configuredCollections.map((col) => (
        <DealRow
          key={col.title}
          title={col.title}
          to={collectionLink(col)}
          products={collections[col.title]}
          assuredMinRating={commerce.assuredMinRating}
        />
      ))}

      {(homepage.trustBadges || []).length > 0 && (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-ink-100 bg-ink-100 lg:grid-cols-4">
          {homepage.trustBadges.map((item) => {
            const Icon = iconByName(item.icon);
            return (
              <div key={item.title} className="flex items-center gap-3 bg-white px-4 py-3">
                <span className="shrink-0 text-accent-500">
                  <Icon size={24} />
                </span>
                <div>
                  <strong className="block text-xs font-bold text-ink-900">{item.title}</strong>
                  <span className="block text-[11px] text-ink-400">{item.subtitle}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;
