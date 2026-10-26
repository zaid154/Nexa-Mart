import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient.js";
import ProductCard from "./productCard.jsx";

const CATEGORIES = [
  {
    name: "Smartphones",
    image: "/images/products/iphone-13-pro/1.webp",
    path: "/products?category=Smartphones",
  },
  {
    name: "Laptops",
    image: "/images/products/apple-macbook-pro-14-inch-space-grey/1.webp",
    path: "/products?category=Laptops",
  },
  {
    name: "Audio",
    image: "/images/products/apple-airpods-max-silver/1.webp",
    path: "/products?category=Audio",
  },
  {
    name: "Smartwatches",
    image: "/images/products/apple-watch-series-4-gold/1.webp",
    path: "/products?category=Smartwatches",
  },
  {
    name: "Accessories",
    image: "/images/products/apple-magsafe-battery-pack/1.webp",
    path: "/products?category=Accessories",
  },
  {
    name: "Tablets",
    image: "/images/products/ipad-mini-2021-starlight/1.webp",
    path: "/products?category=Tablets",
  },
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
      {/* Category quick-nav strip with authentic product photos */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-around gap-4 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              to={cat.path}
              className="flex flex-col items-center gap-2 group min-w-[76px] text-center"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-slate-50 border border-slate-200 group-hover:border-blue-600 group-hover:shadow-md flex items-center justify-center p-2.5 transition-all duration-200 group-hover:scale-105 shadow-2xs">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
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

        <div className="hidden md:flex items-center justify-center shrink-0">
          <img
            src="/images/banners/deals.jpg"
            alt="Hot Electronics Deals"
            className="w-72 h-44 object-cover rounded-xl shadow-2xl border-2 border-white/20 transform hover:scale-102 transition-transform duration-300"
          />
        </div>
      </div>

      {/* Value props strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            title: "Free Fast Delivery",
            desc: "On all orders above ₹15,000",
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            ),
          },
          {
            title: "100% Genuine Tech",
            desc: "Direct manufacturer warranty",
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ),
          },
          {
            title: "7-Day Easy Return",
            desc: "Hassle-free replacement policy",
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ),
          },
          {
            title: "Flexible Payments",
            desc: "Razorpay UPI, Cards & COD",
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            ),
          },
        ].map((prop, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              {prop.icon}
            </span>
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
