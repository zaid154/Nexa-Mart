import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import ProductCard from "../components/ProductCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { IconGrid, IconList } from "../components/Icons.jsx";

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ products: [], pages: 1, page: 1, total: 0 });
  const [filters, setFilters] = useState({ categories: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("grid");

  const keyword = params.get("keyword") || "";
  const category = params.get("category") || "";
  const brand = params.get("brand") || "";
  const sort = params.get("sort") || "newest";
  const page = Number(params.get("page") || 1);
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";

  useEffect(() => {
    api.get("/products/filters").then((res) => setFilters(res.data));
  }, []);

  const loadProducts = () => {
    setLoading(true);
    setError("");
    const query = Object.fromEntries(params.entries());
    api
      .get("/products", { params: { ...query, limit: 12 } })
      .then((res) =>
        setData({
          products: res.data?.products || [],
          pages: res.data?.pages || 1,
          page: res.data?.page || 1,
          total: res.data?.total || 0,
        })
      )
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, [params]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next);
  };

  const goPage = (p) => {
    const next = new URLSearchParams(params);
    next.set("page", p);
    setParams(next);
  };

  const clearAll = () => setParams(new URLSearchParams());

  const activeFilters = [
    keyword && { key: "keyword", label: `"${keyword}"`, clear: () => update("keyword", "") },
    category && { key: "category", label: category, clear: () => update("category", "") },
    brand && { key: "brand", label: brand, clear: () => update("brand", "") },
    minPrice && { key: "minPrice", label: `Min ₹${minPrice}`, clear: () => update("minPrice", "") },
    maxPrice && { key: "maxPrice", label: `Max ₹${maxPrice}`, clear: () => update("maxPrice", "") },
  ].filter(Boolean);

  const title = keyword ? `Results for "${keyword}"` : category || brand || "All Products";

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Shop"
        title={title}
        subtitle="Browse our curated collection of premium electronics."
      />

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map((f) => (
            <span key={f.key} className="filter-chip">
              {f.label}
              <button type="button" onClick={f.clear} aria-label={`Remove ${f.label} filter`}>×</button>
            </span>
          ))}
          <button type="button" className="btn-ghost btn-sm" onClick={clearAll}>Clear all</button>
        </div>
      )}

      <div className="catalog">
        <aside className="filters">
          <div className="row-between admin-section-head">
            <strong>Filters</strong>
            <button type="button" className="btn-ghost btn-sm" onClick={clearAll}>Clear</button>
          </div>

          <div className="filter-group">
              <h4>Category</h4>
              <div className="filter-options">
                {filters.categories.map((c) => (
                  <span
                    key={c}
                    className={`chip ${category === c ? "active" : ""}`}
                    onClick={() => update("category", category === c ? "" : c)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && update("category", category === c ? "" : c)}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Brand</h4>
              <div className="filter-options">
                {filters.brands.map((b) => (
                  <span
                    key={b}
                    className={`chip ${brand === b ? "active" : ""}`}
                    onClick={() => update("brand", brand === b ? "" : b)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && update("brand", brand === b ? "" : b)}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Price</h4>
              <div className="row">
                <input
                  className="input"
                  type="number"
                  placeholder="Min"
                  defaultValue={minPrice}
                  onBlur={(e) => update("minPrice", e.target.value)}
                  aria-label="Minimum price"
                />
                <input
                  className="input"
                  type="number"
                  placeholder="Max"
                  defaultValue={maxPrice}
                  onBlur={(e) => update("maxPrice", e.target.value)}
                  aria-label="Maximum price"
                />
              </div>
            </div>
        </aside>

        <div className={view === "list" ? "product-list-view" : ""}>
          <div className="row-between admin-section-head">
            <span className="muted">{data.total} products</span>
            <div className="row gap-2">
              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={view === "grid" ? "active" : ""}
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                >
                  <IconGrid />
                </button>
                <button
                  type="button"
                  className={view === "list" ? "active" : ""}
                  onClick={() => setView("list")}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                >
                  <IconList />
                </button>
              </div>
              <select
                className="select select-inline"
                value={sort}
                onChange={(e) => update("sort", e.target.value)}
                aria-label="Sort products"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {error ? (
            <ErrorState title="Failed to load products" message={error} onRetry={loadProducts} />
          ) : loading ? (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : data.products.length === 0 ? (
            <EmptyState
              eyebrow="No results"
              title="Nothing found"
              message="No products match your filters. Try adjusting your search."
              action={<button type="button" className="btn" onClick={clearAll}>Clear filters</button>}
            />
          ) : (
            <>
              <div className="product-grid">
                {data.products.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </div>

              {data.pages > 1 && (
                <nav className="row pagination" aria-label="Pagination">
                  {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`btn btn-sm ${p === page ? "" : "btn-outline"}`}
                      onClick={() => goPage(p)}
                      aria-current={p === page ? "page" : undefined}
                    >
                      {p}
                    </button>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
