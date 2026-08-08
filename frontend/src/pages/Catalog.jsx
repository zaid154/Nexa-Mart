import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { IconGrid, IconList, IconHeart, IconChevron, IconSearch, IconClose } from "../components/Icons.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useCartDrawer } from "../context/CartDrawerContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatINR } from "../utils/format.js";
import { onProductImageError, PRODUCT_IMAGE_PLACEHOLDER } from "../utils/productImage.js";

// Marketplace-style horizontal product row for the list view: image on the left,
// name + rating + description in the middle, price + delivery + add-to-cart
// on the right.
const ProductListRow = ({ product }) => {
  const { user } = useAuth();
  const { addToCart, addToWishlist, removeFromWishlist, inWishlist } = useCart();
  const { open: openCartDrawer } = useCartDrawer();
  const toast = useToast();
  const navigate = useNavigate();

  const isWished = inWishlist(product._id);
  const discount =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;
  const outOfStock = product.countInStock === 0;

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
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Same default configuration the grid tile and the product page use. Adding
  // with no variant here is what used to put the row's line and the product
  // page's line in the cart as two separate entries for one product.
  const defaultVariantId = product.variants?.[0]?._id || null;

  const handleAdd = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await addToCart(product._id, 1, defaultVariantId);
      openCartDrawer();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Fall back to the placeholder rather than rendering an empty box.
  const cover = product.media?.[0];
  const image = cover?.url || product.images?.[0] || PRODUCT_IMAGE_PLACEHOLDER;

  // The row is clickable via a link laid over it, with the buttons above that
  // link. This keeps the big click target without nesting a <button> inside an
  // <a>, which is invalid and confuses screen readers.
  return (
    <div className="group relative flex gap-4 p-4 transition-colors hover:bg-ink-50/40 sm:gap-6">
      <Link to={`/products/${product._id}`} className="absolute inset-0 z-10">
        <span className="sr-only">{product.name}</span>
      </Link>

      {/* Image + wishlist */}
      <div className="pointer-events-none relative shrink-0">
        <div className="grid h-32 w-24 place-items-center overflow-hidden bg-white sm:h-44 sm:w-44">
          <img
            src={image}
            srcSet={cover?.srcset || undefined}
            sizes={cover?.srcset ? "(min-width: 640px) 176px, 96px" : undefined}
            alt={product.name}
            width={cover?.width || 400}
            height={cover?.height || 400}
            loading="lazy"
            decoding="async"
            onError={onProductImageError}
            className={`h-full w-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105 ${
              outOfStock ? "opacity-50" : ""
            }`}
          />
        </div>
        <button
          type="button"
          onClick={handleWishlist}
          className={`pointer-events-auto absolute right-1 top-1 z-20 grid h-8 w-8 place-items-center rounded-full border border-ink-100 bg-white/95 shadow-sm transition-colors hover:text-danger ${
            isWished ? "text-danger" : "text-ink-400"
          }`}
          aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
        >
          <IconHeart size={16} filled={isWished} />
        </button>
      </div>

      {/* On phones the price sits under the details instead of fighting them
          for width in a third column. */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:gap-6">
        <div className="pointer-events-none min-w-0 flex-1">
          <p className="text-2xs font-bold uppercase tracking-wide text-ink-400">{product.brand}</p>
          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-medium text-ink-900 group-hover:text-accent-600 sm:text-base">
            {product.name}
          </h3>
          {product.rating > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-0.5 rounded bg-success px-1.5 py-0.5 text-2xs font-bold text-white">
                {product.rating.toFixed(1)} ★
              </span>
              <span className="text-xs text-ink-400">
                {product.numReviews} Rating{product.numReviews === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {product.description && (
            <p className="mt-2 line-clamp-2 hidden text-sm text-ink-500 sm:block">
              {product.description}
            </p>
          )}
          <p className={`mt-2 text-xs font-semibold ${outOfStock ? "text-danger" : "text-success"}`}>
            {outOfStock ? "Out of stock" : "In stock"}
          </p>
        </div>

        {/* Price + actions */}
        <div className="pointer-events-none flex shrink-0 flex-col items-start text-left sm:w-44 sm:items-end sm:text-right">
          <span className="price text-lg sm:text-xl">{formatINR(product.price)}</span>
          {discount > 0 && (
            <span className="mt-0.5 text-xs sm:text-sm">
              <span className="text-ink-400 line-through">{formatINR(product.mrp)}</span>{" "}
              <span className="font-semibold text-success">{discount}% off</span>
            </span>
          )}
          <span className="mt-2 hidden text-xs font-semibold text-accent-600 sm:inline">
            ✓ Free delivery
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock}
            className="btn btn-cart btn-sm pointer-events-auto relative z-20 mt-3 w-full"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
};

// Marketplace-style sort tabs (label shown, key sent to the API).
const SORTS = [
  { key: "rating", label: "Popularity" },
  { key: "price_asc", label: "Price -- Low to High" },
  { key: "price_desc", label: "Price -- High to Low" },
  { key: "newest", label: "Newest First" },
];

// One collapsible block in the filter sidebar (Categories, Brand, Price).
// Kept at module level, not inside Catalog, so React does not remount it on
// every render — otherwise the brand search box would lose focus on each key.
const FilterSection = ({ title, count, open, onToggle, children }) => (
  <div className="border-b border-ink-100 last:border-b-0">
    <button
      type="button"
      className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left transition-colors hover:bg-ink-50"
      onClick={onToggle}
      aria-expanded={open}
    >
      <span className="flex items-center gap-1.5">
        <span className="text-2xs font-bold uppercase tracking-wider text-ink-400">{title}</span>
        {count > 0 && (
          <span className="rounded-full bg-accent-50 px-1.5 text-[10px] font-bold text-accent-600">
            {count}
          </span>
        )}
      </span>
      <span className={`text-ink-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}>
        <IconChevron size={14} />
      </span>
    </button>
    {open && <div className="px-4 pb-4">{children}</div>}
  </div>
);

// One checkbox row. Categories and Brand both use this, so they finally look
// the same (before, categories used a fake tick span and brands a raw input).
const CheckRow = ({ label, checked, onChange }) => (
  <li>
    <label className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2 py-[7px] transition-colors hover:bg-accent-50">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded border-[1.5px] border-ink-300 bg-white text-transparent transition-colors peer-checked:border-accent-500 peer-checked:bg-accent-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-accent-500/30">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      <span className={`text-sm ${checked ? "font-semibold text-accent-600" : "text-ink-600"}`}>
        {label}
      </span>
    </label>
  </li>
);

// Product listing page with filters, sorting, and pagination.
const Catalog = () => {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ products: [], pages: 1, page: 1, total: 0 });
  const [filters, setFilters] = useState({ categories: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("list");
  // Sidebar UI state: which sections are folded shut, and the brand search text.
  const [closedSections, setClosedSections] = useState([]);
  const [brandQuery, setBrandQuery] = useState("");

  // Read the current filter values from the URL query string.
  const keyword = params.get("keyword") || "";
  const category = params.get("category") || "";
  const brand = params.get("brand") || "";
  const sort = params.get("sort") || "newest";
  const page = Number(params.get("page") || 1);
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";

  // Load the list of categories and brands once for the filter sidebar.
  useEffect(() => {
    api.get("/products/filters").then((res) => setFilters(res.data));
  }, []);

  // Load products that match the current filters in the URL.
  const loadProducts = () => {
    setLoading(true);
    setError("");
    const query = Object.fromEntries(params.entries());
    api
      .get("/products", { params: { ...query, limit: 12 } })
      .then((res) => {
        setData({
          products: res.data?.products || [],
          pages: res.data?.pages || 1,
          page: res.data?.page || 1,
          total: res.data?.total || 0,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [params]);

  // Set or remove one filter in the URL and reset to page 1.
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete("page");
    setParams(next);
  };

  // Go to a specific page number.
  const goPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next);
  };

  // Remove all filters.
  const clearAll = () => setParams(new URLSearchParams());

  // Several categories/brands can be ticked at once. They travel in the URL as
  // one comma-separated value ("Apple,Dell") and the API splits them back out.
  const categoryList = category ? category.split(",").filter(Boolean) : [];
  const brandList = brand ? brand.split(",").filter(Boolean) : [];

  // Add a value to a comma-separated param, or take it out if already there.
  const toggleInList = (key, list, value) => {
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    update(key, next.join(","));
  };

  // Toggle a category on or off.
  const toggleCategory = (c) => toggleInList("category", categoryList, c);

  // Toggle a brand on or off.
  const toggleBrand = (b) => toggleInList("brand", brandList, b);

  // Fold a sidebar section open or shut.
  const toggleSection = (title) =>
    setClosedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );

  const isOpen = (title) => !closedSections.includes(title);

  // Narrow the brand list with the little search box, so a long list of
  // brands does not turn into an endless scroll.
  const visibleBrands = filters.brands.filter((b) =>
    b.toLowerCase().includes(brandQuery.trim().toLowerCase())
  );

  // Build the list of active filter chips.
  const activeFilters = [];
  if (keyword) {
    activeFilters.push({ key: "keyword", label: `"${keyword}"`, clear: () => update("keyword", "") });
  }
  // One chip per ticked category/brand, so each can be removed on its own.
  categoryList.forEach((c) => {
    activeFilters.push({ key: `category:${c}`, label: c, clear: () => toggleCategory(c) });
  });
  brandList.forEach((b) => {
    activeFilters.push({ key: `brand:${b}`, label: b, clear: () => toggleBrand(b) });
  });
  if (minPrice) {
    activeFilters.push({ key: "minPrice", label: `Min ₹${minPrice}`, clear: () => update("minPrice", "") });
  }
  if (maxPrice) {
    activeFilters.push({ key: "maxPrice", label: `Max ₹${maxPrice}`, clear: () => update("maxPrice", "") });
  }

  // Decide the page title based on the active filter. With more than one box
  // ticked we list them, so the heading matches what is actually selected.
  let title = "All Products";
  if (keyword) {
    title = `Results for "${keyword}"`;
  } else if (categoryList.length > 0) {
    title = categoryList.join(", ");
  } else if (brandList.length > 0) {
    title = brandList.join(", ");
  }

  // "Showing a–b of total" range.
  const rangeStart = data.total === 0 ? 0 : (data.page - 1) * 12 + 1;
  const rangeEnd = (data.page - 1) * 12 + data.products.length;

  const gridClass = "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 md:gap-4";

  const pagination = data.pages > 1 && (
    <nav className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-4" aria-label="Pagination">
      <button type="button" className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => goPage(page - 1)}>
        Prev
      </button>
      <span className="text-sm text-ink-500">
        Page <strong className="text-ink-900">{page}</strong> of {data.pages}
      </span>
      <button type="button" className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => goPage(page + 1)}>
        Next
      </button>
    </nav>
  );

  const renderProducts = () => {
    if (error) {
      return (
        <div className="p-4">
          <ErrorState title="Failed to load products" message={error} onRetry={loadProducts} />
        </div>
      );
    }
    if (loading) {
      return (
        <div className="p-3 sm:p-4">
          <div className={gridClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      );
    }
    if (data.products.length === 0) {
      return (
        <div className="p-4">
          <EmptyState
            eyebrow="No results"
            title="Nothing found"
            message="No products match your filters. Try adjusting your search."
            action={<button type="button" className="btn" onClick={clearAll}>Clear filters</button>}
          />
        </div>
      );
    }

    if (view === "list") {
      return (
        <>
          <div className="divide-y divide-ink-100">
            {data.products.map((p) => (
              <ProductListRow key={p._id} product={p} />
            ))}
          </div>
          {pagination}
        </>
      );
    }

    return (
      <>
        <div className="p-3 sm:p-4">
          <div className={gridClass}>
            {data.products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
        {pagination}
      </>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-ink-400" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-accent-600">Home</Link>
        <span aria-hidden="true">›</span>
        <Link to="/products" className="hover:text-accent-600">Products</Link>
        {title !== "All Products" && (
          <>
            <span aria-hidden="true">›</span>
            <span className="font-medium text-ink-700">{title}</span>
          </>
        )}
      </nav>

      <div className="grid items-start gap-4 lg:grid-cols-[260px_1fr]">
        {/* ── Filters sidebar ─────────────────────────── */}
        <aside className="card overflow-hidden p-0 lg:sticky lg:top-24">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3.5">
            <strong className="text-[15px] font-bold text-ink-900">Filters</strong>
            {activeFilters.length > 0 && (
              <button
                type="button"
                className="text-xs font-bold uppercase tracking-wide text-accent-600 transition-colors hover:text-accent-700"
                onClick={clearAll}
              >
                Clear All
              </button>
            )}
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-ink-100 bg-ink-50/60 px-4 py-3">
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-accent-100 bg-accent-50 py-1 pl-2.5 pr-1 text-xs font-medium text-accent-700"
                >
                  <span className="truncate">{f.label}</span>
                  <button
                    type="button"
                    className="grid h-4 w-4 shrink-0 place-items-center rounded-full text-accent-600 transition-colors hover:bg-accent-500 hover:text-white"
                    onClick={f.clear}
                    aria-label={`Remove ${f.label}`}
                  >
                    <IconClose size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <FilterSection
            title="Categories"
            count={categoryList.length}
            open={isOpen("Categories")}
            onToggle={() => toggleSection("Categories")}
          >
            <ul className="space-y-0.5">
              {filters.categories.map((c) => (
                <CheckRow
                  key={c}
                  label={c}
                  checked={categoryList.includes(c)}
                  onChange={() => toggleCategory(c)}
                />
              ))}
            </ul>
          </FilterSection>

          <FilterSection
            title="Brand"
            count={brandList.length}
            open={isOpen("Brand")}
            onToggle={() => toggleSection("Brand")}
          >
            {filters.brands.length > 6 && (
              <div className="relative mb-2">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400">
                  <IconSearch size={13} />
                </span>
                <input
                  className="input py-1.5 pl-8 text-sm"
                  type="text"
                  value={brandQuery}
                  onChange={(e) => setBrandQuery(e.target.value)}
                  placeholder="Search brand"
                  aria-label="Search brands"
                />
              </div>
            )}
            <ul className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
              {visibleBrands.map((b) => (
                <CheckRow key={b} label={b} checked={brandList.includes(b)} onChange={() => toggleBrand(b)} />
              ))}
              {visibleBrands.length === 0 && (
                <li className="px-2 py-3 text-center text-xs text-ink-400">No brand matches “{brandQuery}”</li>
              )}
            </ul>
          </FilterSection>

          <FilterSection
            title="Price"
            count={minPrice || maxPrice ? 1 : 0}
            open={isOpen("Price")}
            onToggle={() => toggleSection("Price")}
          >
            <div className="flex items-center gap-2">
              <input
                className="input py-1.5 text-sm"
                type="number"
                placeholder="Min ₹"
                defaultValue={minPrice}
                onBlur={(e) => update("minPrice", e.target.value)}
                aria-label="Minimum price"
              />
              <span className="text-ink-300">–</span>
              <input
                className="input py-1.5 text-sm"
                type="number"
                placeholder="Max ₹"
                defaultValue={maxPrice}
                onBlur={(e) => update("maxPrice", e.target.value)}
                aria-label="Maximum price"
              />
            </div>
          </FilterSection>
        </aside>

        {/* ── Results ─────────────────────────────────── */}
        <div className="min-w-0">
          {/* Result heading */}
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-lg font-bold text-ink-900">
              {title}{" "}
              {data.total > 0 && (
                <span className="text-sm font-normal text-ink-400">
                  (Showing {rangeStart}–{rangeEnd} of {data.total} products)
                </span>
              )}
            </h1>
          </div>

          {/* Sort tabs bar */}
          <div className="card mb-3 flex items-center gap-1 overflow-x-auto px-3 py-1.5">
            <span className="mr-1 shrink-0 px-2 text-sm font-bold text-ink-700">Sort By</span>
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => update("sort", s.key)}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm transition-colors ${
                  sort === s.key
                    ? "border-accent-500 font-semibold text-accent-600"
                    : "border-transparent font-medium text-ink-500 hover:text-ink-900"
                }`}
              >
                {s.label}
              </button>
            ))}
            <div className="ml-auto flex shrink-0 items-center rounded-lg border border-ink-200 p-0.5" role="group" aria-label="View mode">
              <button
                type="button"
                className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${view === "grid" ? "bg-accent-500 text-white" : "text-ink-400 hover:text-ink-900"}`}
                onClick={() => setView("grid")}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
              >
                <IconGrid />
              </button>
              <button
                type="button"
                className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${view === "list" ? "bg-accent-500 text-white" : "text-ink-400 hover:text-ink-900"}`}
                onClick={() => setView("list")}
                aria-label="List view"
                aria-pressed={view === "list"}
              >
                <IconList />
              </button>
            </div>
          </div>

          <div className="card overflow-hidden">{renderProducts()}</div>
        </div>
      </div>
    </div>
  );
};

export default Catalog;
