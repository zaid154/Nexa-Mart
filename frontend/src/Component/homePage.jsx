import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient.js";
import ProductCard from "./productCard.jsx";

const CATEGORIES = [
  { name: "Smartphones", icon: "📱", path: "/products?category=Smartphones" },
  { name: "Laptops", icon: "💻", path: "/products?category=Laptops" },
  { name: "Audio", icon: "🎧", path: "/products?category=Audio" },
  { name: "Smartwatches", icon: "⌚", path: "/products?category=Smartwatches" },
  { name: "Accessories", icon: "🔌", path: "/products?category=Accessories" },
  { name: "Tablets", icon: "📱", path: "/products?category=Tablets" },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch top rated electronics and newest additions for home storefront
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.get("/products", { params: { limit: 8, sort: "rating" } }),
      api.get("/products", { params: { limit: 4, sort: "newest" } }),
    ])
      .then(([featRes, newRes]) => {
        if (!isMounted) return;
        setFeaturedProducts(featRes.data?.products || []);
        setNewArrivals(newRes.data?.products || []);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-8">
      {/* Category quick-nav strip */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-around gap-4 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              to={cat.path}
              className="flex flex-col items-center gap-2 group min-w-[70px] text-center"
            >
              <span className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 group-hover:border-blue-600 group-hover:bg-blue-50 flex items-center justify-center text-2xl transition-all group-hover:scale-105 shadow-2xs">
                {cat.icon}
              </span>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Hero promo banner */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-[#172337] via-[#1a4fa8] to-[#2874f0] text-white p-8 sm:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-lg flex flex-col gap-3">
          <span className="inline-block self-start text-xs font-bold tracking-wider uppercase bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-white">
            Grand Electronics Sale
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Next-Gen Tech, Unbeatable Prices.
          </h1>
          <p className="text-sm text-blue-100 leading-relaxed">
            Upgrade your setup with authentic smartphones, laptops, audio gear, and wearables with verified warranty.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <Link
              to="/products"
              className="px-6 py-3 bg-[#fb641b] hover:bg-[#e85a14] text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-md transition-colors"
            >
              Explore Deals &rarr;
            </Link>
            <Link
              to="/products?category=Smartphones"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-md border border-white/20 transition-colors"
            >
              Smartphones
            </Link>
          </div>
        </div>

        <div className="text-7xl select-none hidden md:block opacity-90 animate-pulse">
          ⚡
        </div>
      </div>

      {/* Value props strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: "🚚", title: "Free Fast Delivery", desc: "On all orders above ₹15,000" },
          { icon: "🛡️", title: "100% Genuine Tech", desc: "Direct manufacturer warranty" },
          { icon: "🔄", title: "7-Day Easy Return", desc: "Hassle-free replacement policy" },
          { icon: "💳", title: "Flexible Payments", desc: "Razorpay UPI, Cards & COD" },
        ].map((prop, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex items-center gap-3">
            <span className="text-2xl">{prop.icon}</span>
            <div>
              <p className="text-xs font-bold text-slate-800">{prop.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{prop.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Featured electronics section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Top Rated Electronics</h2>
            <p className="text-xs text-slate-500">Hand-picked bestsellers with top customer ratings</p>
          </div>
          <Link
            to="/products?sort=rating"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            View All &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 bg-slate-50 rounded-lg animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {featuredProducts.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>

      {/* New arrivals section */}
      {newArrivals.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">New Arrivals</h2>
              <p className="text-xs text-slate-500">Fresh additions to our electronics catalogue</p>
            </div>
            <Link
              to="/products?sort=newest"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Browse New &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {newArrivals.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
