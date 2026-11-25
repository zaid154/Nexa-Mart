import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient.js";
import ProductCard from "./productCard.jsx";
import { IconTruck, IconShield, IconRefresh, IconCreditCard } from "./icons.jsx";

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

const HERO_SLIDES = [
  {
    tag: "MEGA SALE",
    title: "Flagship Smartphones",
    subtitle: "Up to 40% off on iPhone 13 Pro, Galaxy & 5G devices",
    cta: "Explore Mobiles",
    link: "/products?category=Smartphones",
    image: "/images/banners/phone.jpg",
    bg: "from-[#0d1b2a] via-[#1b263b] to-[#2874f0]",
  },
  {
    tag: "POWER & WORK",
    title: "Performance Laptops",
    subtitle: "Apple MacBook Pro, Dell XPS 13 & ZenBook with warranty",
    cta: "Shop Laptops",
    link: "/products?category=Laptops",
    image: "/images/banners/laptop.jpg",
    bg: "from-[#111827] via-[#1f2937] to-[#374151]",
  },
  {
    tag: "PREMIUM SOUND",
    title: "Audio & Wearables",
    subtitle: "AirPods Max, Studio Headphones & Apple Watch Series",
    cta: "Discover Audio",
    link: "/products?category=Audio",
    image: "/images/banners/headphones.jpg",
    bg: "from-[#0c4a6e] via-[#075985] to-[#0284c7]",
  },
];

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  // Auto-advance hero slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch top rated electronics and newest additions for storefront
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
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
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

      {/* Hero Promo Carousel with real photography */}
      <div className="relative rounded-xl overflow-hidden shadow-sm bg-slate-900 min-h-[220px] sm:min-h-[280px]">
        {HERO_SLIDES.map((slide, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 bg-gradient-to-r ${slide.bg} p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 transition-opacity duration-700 ${
              idx === activeSlide ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
            }`}
          >
            <div className="max-w-lg flex flex-col gap-3 text-white">
              <span className="inline-block self-start text-[11px] font-bold tracking-wider uppercase bg-white/15 px-3 py-1 rounded-full border border-white/10">
                {slide.tag}
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold leading-tight">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {slide.subtitle}
              </p>
              <div className="pt-2">
                <Link
                  to={slide.link}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#fb641b] hover:bg-[#e85a14] text-white font-bold text-xs uppercase tracking-wider rounded-md shadow-md transition-colors"
                >
                  {slide.cta} &rarr;
                </Link>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-end shrink-0">
              <img
                src={slide.image}
                alt={slide.title}
                className="w-72 h-44 sm:w-80 sm:h-52 object-cover rounded-xl shadow-2xl border-2 border-white/20 transform hover:scale-102 transition-transform duration-300"
              />
            </div>
          </div>
        ))}

        {/* Carousel indicator dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === activeSlide ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Unified E-Commerce Trust Bar */}
      <div className="bg-white rounded-lg border border-slate-200 py-3.5 px-6 shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <IconTruck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Free Fast Delivery</h4>
            <p className="text-[11px] text-slate-500">Orders above ₹15,000</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <IconShield size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">100% Genuine Tech</h4>
            <p className="text-[11px] text-slate-500">Official brand warranty</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <IconRefresh size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">7-Day Easy Returns</h4>
            <p className="text-[11px] text-slate-500">Hassle-free replacement</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-3 lg:pt-0 lg:pl-6">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <IconCreditCard size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Secure Payments</h4>
            <p className="text-[11px] text-slate-500">Razorpay, UPI & COD</p>
          </div>
        </div>
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
