import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client.js";
import ProductCard from "./ProductCard.jsx";

const CATEGORIES = [
  "All",
  "Smartphones",
  "Laptops",
  "Audio",
  "Smartwatches",
  "Accessories",
  "Tablets",
  "Cameras",
];

const PRICE_RANGES = [
  { label: "All Prices", min: 0, max: Infinity },
  { label: "Under ₹2,000", min: 0, max: 2000 },
  { label: "₹2,000 to ₹10,000", min: 2000, max: 10000 },
  { label: "₹10,000 to ₹30,000", min: 10000, max: 30000 },
  { label: "Above ₹30,000", min: 30000, max: Infinity },
];

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get("category") || "All";
  const activeSearch = searchParams.get("search") || "";
  const activeSort = searchParams.get("sort") || "recommended";
  const activePage = Number(searchParams.get("page")) || 1;

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedPriceRange, setSelectedPriceRange] = useState(0);
  const [minRating, setMinRating] = useState(0);

  // Fetch products matching category, search, sort, and pagination filters
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const params = {
      page: activePage,
      limit: 12,
      sort: activeSort,
    };
    if (activeCategory && activeCategory !== "All") params.category = activeCategory;
    if (activeSearch) params.search = activeSearch;

    const priceFilter = PRICE_RANGES[selectedPriceRange];
    if (priceFilter && priceFilter.min > 0) params.minPrice = priceFilter.min;
    if (priceFilter && priceFilter.max < Infinity) params.maxPrice = priceFilter.max;
    if (minRating > 0) params.rating = minRating;

    api
      .get("/products", { params })
      .then((res) => {
        if (!isMounted) return;
        const list = res.data?.products || [];
        setProducts(list);
        setTotal(res.data?.total || list.length);
        setTotalPages(res.data?.pages || Math.ceil((res.data?.total || list.length) / 12) || 1);
      })
      .catch(() => {
        if (isMounted) setProducts([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeCategory, activeSearch, activeSort, activePage, selectedPriceRange, minRating]);

  const updateParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val && val !== "All") {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const handleResetFilters = () => {
    setSelectedPriceRange(0);
    setMinRating(0);
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Search Header Banner */}
      {activeSearch && (
        <div className="mb-5 p-3.5 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
          <span className="text-sm text-blue-900 font-medium">
            Search results for <strong className="text-blue-700">"{activeSearch}"</strong> ({total} items found)
          </span>
          <button
            type="button"
            onClick={() => updateParam("search", "")}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
          >
            Clear Search
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left Filter Sidebar */}
        <aside className="bg-white rounded-lg border border-slate-200 p-5 self-start shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Filters</h2>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset All
            </button>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">Category</h3>
            <div className="flex flex-col gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => updateParam("category", cat)}
                  className={`text-left text-xs py-1 px-2 rounded font-medium transition-colors ${
                    activeCategory === cat ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Price Ranges */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">Price Range</h3>
            <div className="flex flex-col gap-1.5">
              {PRICE_RANGES.map((range, idx) => (
                <label key={range.label} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="priceRange"
                    checked={selectedPriceRange === idx}
                    onChange={() => setSelectedPriceRange(idx)}
                    className="accent-blue-600"
                  />
                  <span>{range.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Customer Rating */}
          <div className="pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">Customer Rating</h3>
            <div className="flex flex-col gap-1.5">
              {[4, 3].map((stars) => (
                <label key={stars} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="minRating"
                    checked={minRating === stars}
                    onChange={() => setMinRating(minRating === stars ? 0 : stars)}
                    className="accent-blue-600"
                  />
                  <span>{stars}★ & above</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Product Grid Area */}
        <section className="md:col-span-3 flex flex-col gap-5">
          {/* Top Sort & Count Bar */}
          <div className="bg-white rounded-lg border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <span className="text-xs font-medium text-slate-600">
              Showing <strong className="text-slate-900">{products.length}</strong> of {total} products
            </span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sort By:</span>
              <select
                value={activeSort}
                onChange={(e) => updateParam("sort", e.target.value)}
                className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="recommended">Featured / Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="newest">Newest Arrivals</option>
              </select>
            </div>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 bg-white rounded-lg border border-slate-200 animate-pulse p-4" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center flex flex-col items-center">
              <p className="text-base font-bold text-slate-800">No products found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting or resetting your filter criteria.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((prod) => (
                <ProductCard key={prod._id} product={prod} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                type="button"
                disabled={activePage <= 1}
                onClick={() => updateParam("page", String(activePage - 1))}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50"
              >
                &larr; Prev
              </button>

              <span className="text-xs font-medium text-slate-600 px-2">
                Page {activePage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={activePage >= totalPages}
                onClick={() => updateParam("page", String(activePage + 1))}
                className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
