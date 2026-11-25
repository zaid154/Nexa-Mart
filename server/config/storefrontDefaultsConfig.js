// Default storefront configuration and category tiles

export const DEFAULT_CATEGORY_TILES = [
  { name: "Smartphones", link: "/products?category=Smartphones", image: "/images/products/phone.jpg" },
  { name: "Laptops", link: "/products?category=Laptops", image: "/images/products/laptop.jpg" },
  { name: "Audio", link: "/products?category=Audio", image: "/images/products/audio.jpg" },
  { name: "Watches", link: "/products?category=Watches", image: "/images/products/watch.jpg" },
  { name: "Accessories", link: "/products?category=Accessories", image: "/images/products/accessory.jpg" },
];

export const DEFAULT_HERO_SLIDES = [
  {
    badge: "SALE",
    title: "Latest Smartphones",
    price: "Top Deals Available",
    note: "Free Express Delivery",
    image: "/images/banners/phone.jpg",
    link: "/products?category=Smartphones",
    theme: "blue",
  },
  {
    badge: "ELECTRONICS",
    title: "Laptops & Computers",
    price: "Premium Performance",
    note: "1 Year Official Warranty",
    image: "/images/banners/laptop.jpg",
    link: "/products?category=Laptops",
    theme: "dark",
  },
];

export const DEFAULT_PROMO_TILES = [
  { title: "Trending Audio Gear", subtitle: "High Fidelity Sound", image: "/images/banners/headphones.jpg", link: "/products?category=Audio" },
  { title: "Smart Watches", subtitle: "Stay Connected", image: "/images/banners/watch.jpg", link: "/products?category=Watches" },
];

export const DEFAULT_COLLECTIONS = [
  { title: "Featured Products", category: "", sort: "rating", featured: true },
  { title: "New Arrivals", category: "", sort: "newest", featured: false },
  { title: "Top Rated", category: "", sort: "rating", featured: false },
];

export const DEFAULT_TRUST_BADGES = [
  { icon: "truck", title: "Fast Shipping", subtitle: "Free on orders over ₹5,000" },
  { icon: "shield", title: "Secure Checkout", subtitle: "256-bit encrypted payments" },
  { icon: "refresh", title: "Easy Returns", subtitle: "7-day return policy" },
];

export const DEFAULT_PRODUCT_OFFERS = [
  { label: "Online Discount", text: "Get instant discount with coupon code at checkout" },
  { label: "Fast Delivery", text: "Free shipping on orders above ₹5,000" },
];

export const DEFAULT_SERVICE_BADGES = [
  { icon: "refresh", text: "7 Days Return" },
  { icon: "shield", text: "Brand Warranty" },
  { icon: "truck", text: "Fast Delivery" },
];

export const DEFAULT_POPULAR_SEARCHES = [
  "Smartphones",
  "Laptops",
  "Audio",
  "Watches",
];
