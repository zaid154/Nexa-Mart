// This file holds the sample data and the function that fills (seeds)
// the database with demo users and products.

import User from "../models/User.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Coupon from "../models/Coupon.js";

// The discount coupons created during seeding. Admins can edit these
// or add more from Admin -> Coupons.
const coupons = [
  {
    code: "NEXA15",
    description: "15% off your order",
    type: "percent",
    value: 15,
    minOrderAmount: 0,
    maxDiscount: 0,
    perUserLimit: null,
    isActive: true,
  },
  {
    code: "WELCOME10",
    description: "10% off for new customers",
    type: "percent",
    value: 10,
    minOrderAmount: 0,
    maxDiscount: 0,
    perUserLimit: 1,
    isActive: true,
  },
];

// Make text safe to put inside an SVG/XML string.
const escapeXml = (s) => {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

// Split a long label into at most 2 lines so it fits on the placeholder image.
const wrapLabel = (label, maxPerLine = 16) => {
  const words = label.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const combined = (current + " " + word).trim();

    // If adding this word makes the line too long, start a new line.
    if (combined.length > maxPerLine && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  // Add the last line if there is anything left.
  if (current) {
    lines.push(current.trim());
  }

  // Keep only the first two lines.
  return lines.slice(0, 2);
};

// Build a simple SVG placeholder image (used when there is no real photo).
export const makeImage = (label, brand) => {
  const lines = wrapLabel(label);
  const startY = lines.length > 1 ? 430 : 460;
  const nameTspans = lines
    .map(
      (line, i) =>
        `<text x="400" y="${startY + i * 64}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="600" fill="#1d1d1f">${escapeXml(
          line
        )}</text>`
    )
    .join("\n  ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#f5f5f7"/>
  <rect x="40" y="40" width="720" height="720" rx="14" fill="#ffffff" stroke="#d2d2d7" stroke-width="1.5"/>
  <g transform="translate(400 300)" stroke="#d2d2d7" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <rect x="-70" y="-55" width="140" height="110" rx="12"/>
    <circle cx="0" cy="0" r="30"/>
    <circle cx="48" cy="-32" r="6" fill="#d2d2d7" stroke="none"/>
  </g>
  <text x="400" y="200" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600" letter-spacing="4" fill="#0071e3">${escapeXml(
    brand.toUpperCase()
  )}</text>
  ${nameTspans}
</svg>`;
  return { data: Buffer.from(svg), contentType: "image/svg+xml" };
};

// Build a full Unsplash image URL from a photo id.
const IMG = (id) => {
  return `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;
};

const productImages = {
  "iphone-15.jpg": IMG("photo-1695048133142-1a20484d2569"),
  "iphone-15-pro.jpg": IMG("photo-1695716686109-0cc4e7971031"),
  "iphone-15-pro-max.jpg": IMG("photo-1695653422715-9916d0e5f1b1"),
  "galaxy-s24.jpg": IMG("photo-1610945265064-0e34e5519aed"),
  "galaxy-s24-ultra.jpg": IMG("photo-1610945415295-d9bbf067e59c"),
  "galaxy-a55.jpg": IMG("photo-1511707171634-5f897ff02aa9"),
  "oneplus-13.jpg": IMG("photo-1598327105666-5b89351aff97"),
  "pixel-9.jpg": IMG("photo-1592899677977-9c10ca588bbd"),
  "macbook-air-m3.jpg": IMG("photo-1517336714731-489689fd1ca8"),
  "macbook-pro-m4.jpg": IMG("photo-1611186871348-b1ce06e07ca3"),
  "dell-xps-13.jpg": IMG("photo-1588872657578-7efd1f15569b"),
  "hp-spectre-x360.jpg": IMG("photo-1496181133206-80ce9b88a853"),
  "thinkpad-x1-carbon.jpg": IMG("photo-1525547719570-da1b38301da2"),
  "asus-rog-zephyrus-g14.jpg": IMG("photo-1603302576837-37561b2e0e88"),
  "airpods-pro-2.jpg": IMG("photo-1606220945770-b5b6c2c55bf1"),
  "sony-wh-1000xm5.jpg": IMG("photo-1618366712010-f8ae0b5a01c5"),
  "jbl-tune-770nc.jpg": IMG("photo-1505740420928-5e560c06d30e"),
  "boat-rockerz-550.jpg": IMG("photo-1484704849701-f032a568e944"),
  "apple-watch-series-10.jpg": IMG("photo-1434493789847-2f02dc6ca35d"),
  "galaxy-watch-7.jpg": IMG("photo-1523275335684-37898b6baf30"),
  "apple-watch-se-2.jpg": IMG("photo-1546862513-da3b67744cd2"),
  "noise-colorfit-pro-5.jpg": IMG("photo-1579586337278-3befd40fd17a"),
  "ipad-air-m2.jpg": IMG("photo-1544244015-0df4b3ffc6b0"),
  "ipad-pro-m4.jpg": IMG("photo-1561154464-82e9adf32764"),
  "galaxy-tab-s10-plus.jpg": IMG("photo-1585790050230-5dd28404c9c4"),
  "playstation-5.jpg": IMG("photo-1606813907291-d86efa9b94df"),
  "xbox-series-x.jpg": IMG("photo-1621259182978-fbf931c1e05f"),
  "nintendo-switch-oled.jpg": IMG("photo-1578303512597-81e6cc28f3ae"),
  "logitech-mx-master-3s.jpg": IMG("photo-1527814050087-3793815479db"),
  "logitech-mx-keys-s.jpg": IMG("photo-1587825140708-dfaf12aecc66"),
  "samsung-t7-ssd.jpg": IMG("photo-1597872200969-2b65d56bd64b"),
  "anker-737-powerbank.jpg": IMG("photo-1556656793-08538906a9f8"),
  "apple-magsafe-charger.jpg": IMG("photo-1583394838333-de0d6a660c45"),
};

const products = [
  // ── Smartphones (8) ──────────────────────────────────────────
  {
    name: "Apple iPhone 15",
    brand: "Apple",
    category: "Smartphones",
    description:
      "Apple iPhone 15 featuring A16 Bionic chip, Dynamic Island, advanced dual-camera system with 48MP main sensor, and all-day battery life with USB-C charging.",
    price: 69900,
    mrp: 79900,
    countInStock: 42,
    isFeatured: true,
    rating: 4.7,
    numReviews: 2847,
    image: "iphone-15.jpg",
    specs: {
      Display: "6.1-inch Super Retina XDR OLED",
      Processor: "A16 Bionic",
      Storage: "128GB",
      Camera: "48MP Main + 12MP Ultra Wide",
      Battery: "3349mAh",
      OS: "iOS 17",
    },
  },
  {
    name: "Apple iPhone 15 Pro",
    brand: "Apple",
    category: "Smartphones",
    description:
      "iPhone 15 Pro with titanium design, A17 Pro chip, Action button, and a pro-grade camera system with 5x optical zoom telephoto lens.",
    price: 134900,
    mrp: 144900,
    countInStock: 28,
    isFeatured: true,
    rating: 4.8,
    numReviews: 1923,
    image: "iphone-15-pro.jpg",
    specs: {
      Display: "6.1-inch Super Retina XDR OLED, 120Hz ProMotion",
      Processor: "A17 Pro",
      Storage: "128GB",
      Camera: "48MP Main + 12MP Ultra Wide + 12MP 5x Telephoto",
      Battery: "3274mAh",
      OS: "iOS 17",
    },
  },
  {
    name: "Apple iPhone 15 Pro Max",
    brand: "Apple",
    category: "Smartphones",
    description:
      "The largest iPhone 15 Pro Max with a 6.7-inch display, A17 Pro chip, titanium build, and the most advanced camera system in any iPhone.",
    price: 159900,
    mrp: 169900,
    countInStock: 15,
    isFeatured: false,
    rating: 4.9,
    numReviews: 1456,
    image: "iphone-15-pro-max.jpg",
    specs: {
      Display: "6.7-inch Super Retina XDR OLED, 120Hz ProMotion",
      Processor: "A17 Pro",
      Storage: "256GB",
      Camera: "48MP Main + 12MP Ultra Wide + 12MP 5x Telephoto",
      Battery: "4422mAh",
      OS: "iOS 17",
    },
  },
  {
    name: "Samsung Galaxy S24",
    brand: "Samsung",
    category: "Smartphones",
    description:
      "Samsung Galaxy S24 with Galaxy AI, Snapdragon 8 Gen 3, 6.2-inch Dynamic AMOLED 2X display, and a versatile triple-camera setup for stunning photos.",
    price: 74999,
    mrp: 79999,
    countInStock: 35,
    isFeatured: true,
    rating: 4.6,
    numReviews: 2134,
    image: "galaxy-s24.jpg",
    specs: {
      Display: "6.2-inch Dynamic AMOLED 2X, 120Hz",
      Processor: "Snapdragon 8 Gen 3",
      Storage: "256GB",
      Camera: "50MP Wide + 12MP Ultra Wide + 10MP Telephoto",
      Battery: "4000mAh",
      OS: "Android 14, One UI 6.1",
    },
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    brand: "Samsung",
    category: "Smartphones",
    description:
      "Galaxy S24 Ultra with built-in S Pen, 200MP camera, titanium frame, and Galaxy AI features for productivity and creativity on the go.",
    price: 124999,
    mrp: 134999,
    countInStock: 22,
    isFeatured: true,
    rating: 4.8,
    numReviews: 1678,
    image: "galaxy-s24-ultra.jpg",
    specs: {
      Display: "6.8-inch Dynamic AMOLED 2X, 120Hz",
      Processor: "Snapdragon 8 Gen 3",
      Storage: "256GB",
      Camera: "200MP Wide + 50MP Periscope + 12MP Ultra Wide + 10MP Telephoto",
      Battery: "5000mAh",
      OS: "Android 14, One UI 6.1",
    },
  },
  {
    name: "Samsung Galaxy A55 5G",
    brand: "Samsung",
    category: "Smartphones",
    description:
      "Galaxy A55 5G delivers premium design with a metal frame, Super AMOLED display, 50MP OIS camera, and 5 years of security updates at an accessible price.",
    price: 39999,
    mrp: 42999,
    countInStock: 55,
    isFeatured: false,
    rating: 4.4,
    numReviews: 3421,
    image: "galaxy-a55.jpg",
    specs: {
      Display: "6.6-inch Super AMOLED, 120Hz",
      Processor: "Exynos 1480",
      Storage: "128GB",
      Camera: "50MP OIS + 12MP Ultra Wide + 5MP Macro",
      Battery: "5000mAh",
      OS: "Android 14, One UI 6.1",
    },
  },
  {
    name: "OnePlus 13",
    brand: "OnePlus",
    category: "Smartphones",
    description:
      "OnePlus 13 powered by Snapdragon 8 Elite, featuring a 6.82-inch LTPO AMOLED display, Hasselblad-tuned triple camera, and 100W SUPERVOOC fast charging.",
    price: 69999,
    mrp: 74999,
    countInStock: 30,
    isFeatured: false,
    rating: 4.5,
    numReviews: 987,
    image: "oneplus-13.jpg",
    specs: {
      Display: "6.82-inch LTPO AMOLED, 120Hz",
      Processor: "Snapdragon 8 Elite",
      Storage: "256GB",
      Camera: "50MP Hasselblad + 50MP Ultra Wide + 50MP Periscope",
      Battery: "6000mAh",
      OS: "Android 15, OxygenOS 15",
    },
  },
  {
    name: "Google Pixel 9",
    brand: "Google",
    category: "Smartphones",
    description:
      "Google Pixel 9 with Tensor G4 chip, best-in-class computational photography, 7 years of OS updates, and Gemini AI built into every experience.",
    price: 79999,
    mrp: 84999,
    countInStock: 24,
    isFeatured: false,
    rating: 4.6,
    numReviews: 756,
    image: "pixel-9.jpg",
    specs: {
      Display: "6.3-inch Actua OLED, 120Hz",
      Processor: "Google Tensor G4",
      Storage: "128GB",
      Camera: "50MP Wide + 48MP Ultra Wide",
      Battery: "4700mAh",
      OS: "Android 15",
    },
  },

  // ── Laptops (6) ────────────────────────────────────────────
  {
    name: 'Apple MacBook Air 13" M3',
    brand: "Apple",
    category: "Laptops",
    description:
      "MacBook Air with Apple M3 chip delivers incredible performance and up to 18 hours of battery life in an impossibly thin and light design.",
    price: 114900,
    mrp: 119900,
    countInStock: 18,
    isFeatured: true,
    rating: 4.8,
    numReviews: 1543,
    image: "macbook-air-m3.jpg",
    specs: {
      Display: '13.6-inch Liquid Retina, 2560x1664',
      Processor: "Apple M3 (8-core CPU, 10-core GPU)",
      RAM: "8GB Unified Memory",
      Storage: "256GB SSD",
      Battery: "Up to 18 hours",
      Weight: "1.24 kg",
    },
  },
  {
    name: 'Apple MacBook Pro 14" M4',
    brand: "Apple",
    category: "Laptops",
    description:
      "MacBook Pro 14-inch with M4 chip, Liquid Retina XDR display, up to 24 hours battery, and a pro performance system for demanding workflows.",
    price: 169900,
    mrp: 179900,
    countInStock: 12,
    isFeatured: true,
    rating: 4.9,
    numReviews: 892,
    image: "macbook-pro-m4.jpg",
    specs: {
      Display: '14.2-inch Liquid Retina XDR, 3024x1964',
      Processor: "Apple M4 (10-core CPU, 10-core GPU)",
      RAM: "16GB Unified Memory",
      Storage: "512GB SSD",
      Battery: "Up to 24 hours",
      Weight: "1.55 kg",
    },
  },
  {
    name: "Dell XPS 13",
    brand: "Dell",
    category: "Laptops",
    description:
      "Dell XPS 13 with Intel Core Ultra 7, InfinityEdge display, CNC-machined aluminum chassis, and all-day battery for premium portability.",
    price: 139990,
    mrp: 154990,
    countInStock: 14,
    isFeatured: false,
    rating: 4.5,
    numReviews: 634,
    image: "dell-xps-13.jpg",
    specs: {
      Display: '13.4-inch FHD+ InfinityEdge, 1920x1200',
      Processor: "Intel Core Ultra 7 155H",
      RAM: "16GB LPDDR5X",
      Storage: "512GB NVMe SSD",
      Battery: "55Wh, up to 12 hours",
      Weight: "1.17 kg",
    },
  },
  {
    name: "HP Spectre x360 14",
    brand: "HP",
    category: "Laptops",
    description:
      "HP Spectre x360 14 convertible laptop with 2.8K OLED touchscreen, Intel Core Ultra 7, 360-degree hinge, and included HP Pen for creative work.",
    price: 149999,
    mrp: 164999,
    countInStock: 10,
    isFeatured: false,
    rating: 4.4,
    numReviews: 421,
    image: "hp-spectre-x360.jpg",
    specs: {
      Display: '14-inch 2.8K OLED Touch, 2880x1800',
      Processor: "Intel Core Ultra 7 155H",
      RAM: "16GB LPDDR5X",
      Storage: "1TB NVMe SSD",
      Battery: "68Wh, up to 13 hours",
      Weight: "1.39 kg",
    },
  },
  {
    name: "Lenovo ThinkPad X1 Carbon Gen 12",
    brand: "Lenovo",
    category: "Laptops",
    description:
      "ThinkPad X1 Carbon Gen 12 — the ultimate business ultrabook with Intel Core Ultra 7, legendary ThinkPad keyboard, and military-grade durability.",
    price: 159990,
    mrp: 174990,
    countInStock: 8,
    isFeatured: false,
    rating: 4.6,
    numReviews: 387,
    image: "thinkpad-x1-carbon.jpg",
    specs: {
      Display: '14-inch 2.8K OLED, 2880x1800',
      Processor: "Intel Core Ultra 7 165H",
      RAM: "32GB LPDDR5X",
      Storage: "1TB NVMe SSD",
      Battery: "57Wh, up to 15 hours",
      Weight: "1.09 kg",
    },
  },
  {
    name: "ASUS ROG Zephyrus G14",
    brand: "ASUS",
    category: "Laptops",
    description:
      "ROG Zephyrus G14 gaming laptop with AMD Ryzen 9, NVIDIA RTX 4070, AniMe Matrix LED lid, and a compact 14-inch chassis for gaming on the go.",
    price: 164990,
    mrp: 179990,
    countInStock: 6,
    isFeatured: false,
    rating: 4.7,
    numReviews: 512,
    image: "asus-rog-zephyrus-g14.jpg",
    specs: {
      Display: '14-inch 3K OLED, 120Hz, G-Sync',
      Processor: "AMD Ryzen 9 8945HS",
      GPU: "NVIDIA GeForce RTX 4070 8GB",
      RAM: "16GB DDR5",
      Storage: "1TB NVMe SSD",
      Weight: "1.50 kg",
    },
  },

  // ── Headphones (4) ───────────────────────────────────────────
  {
    name: "Apple AirPods Pro (2nd Gen)",
    brand: "Apple",
    category: "Headphones",
    description:
      "AirPods Pro 2 with H2 chip, up to 2x more Active Noise Cancellation, Adaptive Audio, Personalized Spatial Audio, and USB-C charging case.",
    price: 24900,
    mrp: 26900,
    countInStock: 65,
    isFeatured: true,
    rating: 4.7,
    numReviews: 4521,
    image: "airpods-pro-2.jpg",
    specs: {
      Type: "True Wireless In-ear",
      ANC: "Active Noise Cancellation (2x)",
      Chip: "Apple H2",
      Battery: "6 hours (30 hours with case)",
      Connectivity: "Bluetooth 5.3",
      Case: "USB-C, MagSafe, Qi",
    },
  },
  {
    name: "Sony WH-1000XM5",
    brand: "Sony",
    category: "Headphones",
    description:
      "Industry-leading noise cancellation with Auto NC Optimizer, exceptional call quality with precise voice pickup, and up to 30 hours of battery life.",
    price: 29990,
    mrp: 34990,
    countInStock: 38,
    isFeatured: true,
    rating: 4.8,
    numReviews: 3892,
    image: "sony-wh-1000xm5.jpg",
    specs: {
      Type: "Over-ear Wireless",
      ANC: "Industry-leading, Auto NC Optimizer",
      Driver: "30mm",
      Battery: "30 hours (3 min charge = 3 hours)",
      Connectivity: "Bluetooth 5.2, Multipoint",
      Weight: "250g",
    },
  },
  {
    name: "JBL Tune 770NC",
    brand: "JBL",
    category: "Headphones",
    description:
      "JBL Tune 770NC wireless over-ear headphones with JBL Pure Bass Sound, adaptive noise cancelling, and up to 70 hours of playtime.",
    price: 7999,
    mrp: 9999,
    countInStock: 72,
    isFeatured: false,
    rating: 4.3,
    numReviews: 1876,
    image: "jbl-tune-770nc.jpg",
    specs: {
      Type: "Over-ear Wireless",
      ANC: "Adaptive Noise Cancelling",
      Driver: "40mm",
      Battery: "70 hours (5 min charge = 3 hours)",
      Connectivity: "Bluetooth 5.3",
      Weight: "220g",
    },
  },
  {
    name: "boAt Rockerz 550",
    brand: "boAt",
    category: "Headphones",
    description:
      "boAt Rockerz 550 wireless Bluetooth headphones with 50mm drivers, dual connectivity modes, and up to 20 hours of playback on a single charge.",
    price: 1799,
    mrp: 4999,
    countInStock: 120,
    isFeatured: false,
    rating: 4.1,
    numReviews: 12453,
    image: "boat-rockerz-550.jpg",
    specs: {
      Type: "Over-ear Wireless",
      Driver: "50mm",
      Battery: "20 hours",
      Connectivity: "Bluetooth 5.0, AUX, SD Card",
      Weight: "250g",
    },
  },

  // ── Smart Watches (4) ────────────────────────────────────────
  {
    name: "Apple Watch Series 10",
    brand: "Apple",
    category: "Smart Watches",
    description:
      "Apple Watch Series 10 with the thinnest design ever, larger display, sleep apnea detection, faster charging, and comprehensive health tracking.",
    price: 46900,
    mrp: 49900,
    countInStock: 32,
    isFeatured: true,
    rating: 4.7,
    numReviews: 1234,
    image: "apple-watch-series-10.jpg",
    specs: {
      Display: "46mm Always-On Retina LTPO3 OLED",
      Processor: "S10 SiP",
      Storage: "64GB",
      Battery: "Up to 18 hours",
      WaterResistance: "50m, IP6X",
      Sensors: "ECG, Blood Oxygen, Temperature",
    },
  },
  {
    name: "Samsung Galaxy Watch 7",
    brand: "Samsung",
    category: "Smart Watches",
    description:
      "Galaxy Watch 7 with Galaxy AI, advanced sleep coaching, body composition analysis, and seamless integration with Samsung Galaxy ecosystem.",
    price: 32999,
    mrp: 35999,
    countInStock: 28,
    isFeatured: false,
    rating: 4.5,
    numReviews: 876,
    image: "galaxy-watch-7.jpg",
    specs: {
      Display: "44mm Super AMOLED, 3000 nits",
      Processor: "Exynos W1000",
      Storage: "32GB",
      Battery: "Up to 40 hours",
      WaterResistance: "50m, IP68",
      Sensors: "BioActive Sensor, BIA",
    },
  },
  {
    name: "Apple Watch SE (2nd Gen)",
    brand: "Apple",
    category: "Smart Watches",
    description:
      "Apple Watch SE with essential health features, Crash Detection, Fall Detection, and fitness tracking at an accessible price point.",
    price: 29900,
    mrp: 32900,
    countInStock: 45,
    isFeatured: false,
    rating: 4.6,
    numReviews: 2103,
    image: "apple-watch-se-2.jpg",
    specs: {
      Display: "44mm Retina OLED",
      Processor: "S8 SiP",
      Storage: "32GB",
      Battery: "Up to 18 hours",
      WaterResistance: "50m",
      Sensors: "Heart Rate, Crash Detection",
    },
  },
  {
    name: "Noise ColorFit Pro 5",
    brand: "Noise",
    category: "Smart Watches",
    description:
      "Noise ColorFit Pro 5 smartwatch with 1.85-inch AMOLED display, Bluetooth calling, 100+ sports modes, and up to 7 days battery life.",
    price: 4999,
    mrp: 6999,
    countInStock: 95,
    isFeatured: false,
    rating: 4.2,
    numReviews: 5678,
    image: "noise-colorfit-pro-5.jpg",
    specs: {
      Display: "1.85-inch AMOLED, 550 nits",
      Battery: "Up to 7 days",
      WaterResistance: "IP68",
      Connectivity: "Bluetooth 5.3, BT Calling",
      SportsModes: "100+",
      Sensors: "Heart Rate, SpO2, Sleep",
    },
  },

  // ── Tablets (3) ──────────────────────────────────────────────
  {
    name: 'Apple iPad Air 11" M2',
    brand: "Apple",
    category: "Tablets",
    description:
      "iPad Air with M2 chip, 11-inch Liquid Retina display, support for Apple Pencil Pro and Magic Keyboard, in a thin and light design.",
    price: 59900,
    mrp: 64900,
    countInStock: 22,
    isFeatured: false,
    rating: 4.7,
    numReviews: 987,
    image: "ipad-air-m2.jpg",
    specs: {
      Display: '11-inch Liquid Retina, 2360x1640',
      Processor: "Apple M2",
      Storage: "128GB",
      Camera: "12MP Wide + 12MP Front Center Stage",
      Battery: "Up to 10 hours",
      Connectivity: "Wi-Fi 6E, USB-C",
    },
  },
  {
    name: 'Apple iPad Pro 11" M4',
    brand: "Apple",
    category: "Tablets",
    description:
      "iPad Pro with M4 chip, breakthrough Ultra Retina XDR tandem OLED display, and the thinnest Apple product ever for ultimate portability.",
    price: 99900,
    mrp: 104900,
    countInStock: 14,
    isFeatured: true,
    rating: 4.8,
    numReviews: 654,
    image: "ipad-pro-m4.jpg",
    specs: {
      Display: '11-inch Ultra Retina XDR OLED, 120Hz ProMotion',
      Processor: "Apple M4",
      Storage: "256GB",
      Camera: "12MP Wide + 10MP Ultra Wide + LiDAR",
      Battery: "Up to 10 hours",
      Connectivity: "Wi-Fi 6E, USB-C (Thunderbolt)",
    },
  },
  {
    name: "Samsung Galaxy Tab S10+",
    brand: "Samsung",
    category: "Tablets",
    description:
      "Galaxy Tab S10+ with Dynamic AMOLED 2X display, Galaxy AI, S Pen included, and DeX mode for a desktop-like productivity experience.",
    price: 89999,
    mrp: 94999,
    countInStock: 16,
    isFeatured: false,
    rating: 4.5,
    numReviews: 432,
    image: "galaxy-tab-s10-plus.jpg",
    specs: {
      Display: '12.4-inch Dynamic AMOLED 2X, 120Hz',
      Processor: "MediaTek Dimensity 9300+",
      Storage: "256GB",
      Camera: "13MP + 8MP Ultra Wide",
      Battery: "10090mAh",
      Connectivity: "Wi-Fi 7, USB-C",
    },
  },

  // ── Gaming Devices (3) ───────────────────────────────────────
  {
    name: "Sony PlayStation 5 Slim",
    brand: "Sony",
    category: "Gaming Devices",
    description:
      "PlayStation 5 Slim console with 1TB SSD, ray tracing, 4K gaming at up to 120fps, DualSense wireless controller, and backward compatibility.",
    price: 54990,
    mrp: 59990,
    countInStock: 18,
    isFeatured: true,
    rating: 4.8,
    numReviews: 3245,
    image: "playstation-5.jpg",
    specs: {
      Processor: "AMD Zen 2, 8-core @ 3.5GHz",
      GPU: "AMD RDNA 2, 10.28 TFLOPS",
      Storage: "1TB Custom SSD",
      Resolution: "Up to 4K at 120fps",
      RayTracing: "Hardware-accelerated",
      Controller: "DualSense Wireless",
    },
  },
  {
    name: "Microsoft Xbox Series X",
    brand: "Microsoft",
    category: "Gaming Devices",
    description:
      "Xbox Series X — the fastest, most powerful Xbox ever with 12 teraflops of GPU power, 1TB SSD, and true 4K gaming at up to 120fps.",
    price: 52990,
    mrp: 56990,
    countInStock: 15,
    isFeatured: false,
    rating: 4.7,
    numReviews: 2187,
    image: "xbox-series-x.jpg",
    specs: {
      Processor: "AMD Zen 2, 8-core @ 3.8GHz",
      GPU: "AMD RDNA 2, 12 TFLOPS",
      Storage: "1TB Custom NVMe SSD",
      Resolution: "Up to 4K at 120fps",
      RayTracing: "Hardware-accelerated",
      Controller: "Xbox Wireless Controller",
    },
  },
  {
    name: "Nintendo Switch OLED",
    brand: "Nintendo",
    category: "Gaming Devices",
    description:
      "Nintendo Switch OLED model with a vibrant 7-inch OLED screen, enhanced audio, 64GB internal storage, and wide adjustable stand.",
    price: 34999,
    mrp: 37999,
    countInStock: 25,
    isFeatured: false,
    rating: 4.6,
    numReviews: 4532,
    image: "nintendo-switch-oled.jpg",
    specs: {
      Display: "7-inch OLED, 1280x720",
      Storage: "64GB (expandable via microSD)",
      Battery: "4.5–9 hours",
      Modes: "TV, Tabletop, Handheld",
      Audio: "Enhanced front-firing speakers",
      Connectivity: "Wi-Fi, Bluetooth 4.1",
    },
  },

  // ── Accessories (5) ──────────────────────────────────────────
  {
    name: "Logitech MX Master 3S",
    brand: "Logitech",
    category: "Accessories",
    description:
      "MX Master 3S wireless performance mouse with 8K DPI tracking on any surface, quiet clicks, ergonomic design, and multi-device connectivity.",
    price: 9995,
    mrp: 11995,
    countInStock: 58,
    isFeatured: false,
    rating: 4.7,
    numReviews: 2876,
    image: "logitech-mx-master-3s.jpg",
    specs: {
      DPI: "8000",
      Connectivity: "Bluetooth, Logi Bolt USB receiver",
      Battery: "Up to 70 days",
      Buttons: "7 programmable",
      Compatibility: "Windows, macOS, Linux, iPadOS",
      Weight: "141g",
    },
  },
  {
    name: "Logitech MX Keys S",
    brand: "Logitech",
    category: "Accessories",
    description:
      "MX Keys S wireless illuminated keyboard with spherically-dished keys, smart backlighting, and multi-device Easy-Switch for seamless workflow.",
    price: 11995,
    mrp: 13995,
    countInStock: 42,
    isFeatured: false,
    rating: 4.6,
    numReviews: 1543,
    image: "logitech-mx-keys-s.jpg",
    specs: {
      Layout: "Full-size, 108 keys",
      Connectivity: "Bluetooth, Logi Bolt USB receiver",
      Battery: "Up to 10 days (backlit), 5 months (no backlight)",
      Backlight: "Smart ambient light sensor",
      Compatibility: "Windows, macOS, Linux, iOS, Android",
      Weight: "810g",
    },
  },
  {
    name: "Samsung T7 Portable SSD 1TB",
    brand: "Samsung",
    category: "Accessories",
    description:
      "Samsung T7 portable SSD with USB 3.2 Gen 2, read speeds up to 1,050 MB/s, AES 256-bit hardware encryption, and a compact pocket-sized design.",
    price: 8999,
    mrp: 10999,
    countInStock: 75,
    isFeatured: false,
    rating: 4.8,
    numReviews: 4321,
    image: "samsung-t7-ssd.jpg",
    specs: {
      Capacity: "1TB",
      Interface: "USB 3.2 Gen 2 (10Gbps)",
      ReadSpeed: "Up to 1,050 MB/s",
      WriteSpeed: "Up to 1,000 MB/s",
      Encryption: "AES 256-bit hardware",
      Weight: "58g",
    },
  },
  {
    name: "Anker 737 Power Bank 24000mAh",
    brand: "Anker",
    category: "Accessories",
    description:
      "Anker 737 Power Bank with 140W output, 24000mAh capacity, smart digital display, and Power Delivery 3.1 for charging laptops, tablets, and phones.",
    price: 9999,
    mrp: 12999,
    countInStock: 48,
    isFeatured: false,
    rating: 4.5,
    numReviews: 1987,
    image: "anker-737-powerbank.jpg",
    specs: {
      Capacity: "24000mAh (86.4Wh)",
      MaxOutput: "140W",
      Ports: "2x USB-C, 1x USB-A",
      Charging: "Power Delivery 3.1, PPS",
      RechargeTime: "2 hours (65W input)",
      Weight: "630g",
    },
  },
  {
    name: "Apple MagSafe Charger",
    brand: "Apple",
    category: "Accessories",
    description:
      "Apple MagSafe Charger delivers up to 15W of power with perfectly aligned magnetic attachment for iPhone 12 and later, AirPods, and Apple Watch.",
    price: 4500,
    mrp: 4900,
    countInStock: 85,
    isFeatured: false,
    rating: 4.3,
    numReviews: 3456,
    image: "apple-magsafe-charger.jpg",
    specs: {
      Output: "Up to 15W",
      Compatibility: "iPhone 12+, AirPods, Apple Watch",
      Connector: "USB-C",
      Diameter: "60mm",
      CableLength: "1m",
    },
  },
];

// Fill the database with the demo users and products above.
// By default it clears the old data first.
export const seedDatabase = async ({ clear = true } = {}) => {
  // Step 1: remove existing data if asked to.
  if (clear) {
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Product.deleteMany({});
    await Review.deleteMany({});
    await Order.deleteMany({});
    await Coupon.deleteMany({});
  }

  // Step 2: create one admin and one normal demo user.
  console.log("Creating users...");
  await User.create({
    name: "Admin",
    email: "admin@shop.com",
    password: "Admin@123",
    role: "admin",
    isVerified: true,
    status: "active",
  });
  await User.create({
    name: "Demo Customer",
    email: "user@shop.com",
    password: "User@123",
    role: "user",
    isVerified: true,
    status: "active",
  });

  // Step 3: create every product from the list above.
  console.log("Creating products...");
  for (const p of products) {
    const { image, ...data } = p;

    // Build a base64 fallback image in case the online image is missing.
    const { data: svgData, contentType } = makeImage(data.name, data.brand);
    const fallbackUrl = `data:${contentType};base64,${svgData.toString("base64")}`;

    // Use the mapped Unsplash URL if we have one, otherwise the fallback.
    let imageUrl = productImages[image];
    if (!imageUrl) {
      imageUrl = fallbackUrl;
    }

    await Product.create({
      ...data,
      status: "active",
      isActive: true,
      images: [{ url: imageUrl }],
    });
  }

  // Step 4: create the demo discount coupons.
  console.log("Creating coupons...");
  for (const c of coupons) {
    await Coupon.create(c);
  }

  // Count how many products were marked as featured (for the summary log).
  const featured = products.filter((p) => p.isFeatured).length;
  console.log("\nSeed complete!");
  console.log("  Admin login:    admin@shop.com / Admin@123");
  console.log("  Customer login: user@shop.com  / User@123");
  console.log(`  Products:       ${products.length} (${featured} featured)`);
  console.log("  Images:         Unsplash CDN URLs (online)");
  console.log("  Placeholder:    /images/products/_placeholder.svg (fallback)");

  return products.length;
};
