// Starting content for the storefront sections that the admin can edit.
//
// These are only DEFAULTS — they seed the Settings document the first time it
// is created. After that the admin panel is the source of truth, and editing a
// section there never touches this file. Emptying a list in the admin hides
// that section on the storefront.

export const DEFAULT_CATEGORY_TILES = [
  { name: "Mobiles", link: "/products?category=Smartphones", image: "/images/products/iphone-13-pro/color-sierra-blue/1-800.webp" },
  { name: "Laptops", link: "/products?category=Laptops", image: "/images/products/apple-macbook-pro-14-inch-space-grey/_base/1-717.webp" },
  { name: "Audio", link: "/products?category=Audio", image: "/images/products/apple-airpods-max-silver/color-silver/1-727.webp" },
  { name: "Watches", link: "/products?category=Watches", image: "/images/products/apple-watch-series-4-gold/_base/1-741.webp" },
  { name: "Tablets", link: "/products?category=Tablets", image: "/images/products/ipad-mini-2021-starlight/_base/1-800.webp" },
  { name: "Accessories", link: "/products?category=Accessories", image: "/images/products/apple-magsafe-battery-pack/color-white/1-800.webp" },
  { name: "Top Deals", link: "/products?featured=true", image: "/images/products/samsung-galaxy-tab-s8-plus-grey/_base/1-724.webp" },
  { name: "New Arrivals", link: "/products?sort=newest", image: "/images/products/new-dell-xps-13-9300-laptop/_base/1-734.webp" },
];

export const DEFAULT_HERO_SLIDES = [
  {
    badge: "BIG SAVINGS DAYS",
    title: "Flagship Smartphones",
    price: "Up to 40% Off",
    note: "Apple · Samsung · OnePlus · Nothing",
    image: "/images/banners/phone.jpg",
    link: "/products?category=Smartphones",
    theme: "blue",
  },
  {
    badge: "WORK & PLAY",
    title: "Laptops & Ultrabooks",
    price: "From ₹19,990",
    note: "No Cost EMI · Free Delivery",
    image: "/images/banners/laptop.jpg",
    link: "/products?category=Laptops",
    theme: "dark",
  },
  {
    badge: "SOUND FEST",
    title: "Noise Cancelling Audio",
    price: "Flat 50% Off",
    note: "AirPods · AirPods Max · Beats · HomePod",
    image: "/images/banners/headphones.jpg",
    link: "/products?category=Audio",
    theme: "orange",
  },
  {
    badge: "TIMELESS PICKS",
    title: "Watches & Wearables",
    price: "Up to 40% Off",
    note: "Apple · Rolex · Longines · Fossil",
    image: "/images/banners/watch.jpg",
    link: "/products?category=Watches",
    theme: "green",
  },
];

export const DEFAULT_PROMO_TILES = [
  {
    title: "Tablets for every screen",
    subtitle: "From ₹18,999",
    image: "/images/banners/tablet.jpg",
    link: "/products?category=Tablets",
  },
  {
    title: "Everyday Accessories",
    subtitle: "From ₹899",
    image: "/images/banners/accessories.jpg",
    link: "/products?category=Accessories",
  },
];

export const DEFAULT_COLLECTIONS = [
  { title: "Best Sellers & Offers", category: "", sort: "rating", featured: true },
  { title: "New Arrivals", category: "", sort: "newest", featured: false },
  { title: "Top Rated Selection", category: "", sort: "rating", featured: false },
  { title: "Best of Laptops", category: "Laptops", sort: "newest", featured: false },
  { title: "Deals on Smartphones", category: "Smartphones", sort: "price_desc", featured: false },
  { title: "Headphones & Speakers", category: "Audio", sort: "rating", featured: false },
  { title: "Watches for every wrist", category: "Watches", sort: "rating", featured: false },
];

export const DEFAULT_TRUST_BADGES = [
  { icon: "truck", title: "100% Free Shipping", subtitle: "On orders above ₹500" },
  { icon: "shield", title: "NexaMart Assured", subtitle: "Original products & 256-bit security" },
  { icon: "refresh", title: "7 Days Replacement", subtitle: "Hassle-free return policy" },
  { icon: "star", title: "Brand Warranty", subtitle: "Authorized manufacturer warranty" },
];

export const DEFAULT_PRODUCT_OFFERS = [
  {
    label: "Bank Offer",
    text: "10% instant discount on HDFC Bank Credit Card, up to ₹1,500 on orders of ₹5,000 and above",
  },
  { label: "Coupon", text: "Extra 15% off with code NEXA15 at checkout (max ₹500)" },
  {
    label: "No Cost EMI",
    text: "No Cost EMI available on orders above ₹3,000 · standard EMI from 3–24 months",
  },
  { label: "Partner Offer", text: "Get GST invoice and save up to 18% on business purchases" },
];

export const DEFAULT_SERVICE_BADGES = [
  { icon: "refresh", text: "7 Days Replacement" },
  { icon: "shield", text: "Brand Warranty" },
  { icon: "truck", text: "Free Delivery" },
  { icon: "star", text: "NexaMart Assured" },
];

export const DEFAULT_POPULAR_SEARCHES = [
  "iPhone 13 Pro",
  "MacBook Pro",
  "Galaxy S10",
  "AirPods",
  "Apple Watch",
];
