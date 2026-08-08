// This file holds the sample data and the function that fills (seeds)
// the database with demo users, products, reviews, orders and coupons.
//
// Design notes:
//  - Every field written here matches the real Mongoose schemas
//    (User, Product, Review, Order, Coupon) exactly.
//  - The catalogue (catalogue.js) points at photos shipped inside the
//    frontend's public folder, so no product image depends on a third-party
//    CDN staying alive.
//  - Reviews are created through Review.create(), which triggers the
//    model's own post-save hook to recalculate each product's real
//    rating/numReviews — so those numbers are never "fake", they always
//    reflect the review documents that actually exist.
//  - Orders cover the full range of statuses (pending, confirmed,
//    processing, packed, shipped, out_for_delivery, delivered, cancelled,
//    return_requested) with matching trackingHistory entries.

import User from "../models/User.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Coupon from "../models/Coupon.js";
import { catalogue, variantsByProduct } from "./catalogue.js";
import { generateVariantSku } from "./sku.js";

// ─────────────────────────────────────────────────────────────────────────
// Image helpers
// ─────────────────────────────────────────────────────────────────────────

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
    if (combined.length > maxPerLine && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = `${current} ${word}`.trim();
    }
  }
  if (current) {
    lines.push(current.trim());
  }
  return lines.slice(0, 2);
};

// Build a simple SVG placeholder image (used when there is no real photo,
// or when the real photo URL fails the reachability check below).
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

// ─────────────────────────────────────────────────────────────────────────
// Users (1 admin + 6 real customers, each with a real address so orders
// and reviews have believable owners)
// ─────────────────────────────────────────────────────────────────────────

const customerSeed = [
  {
    name: "Demo Customer",
    email: "user@shop.com",
    password: "User@123",
    address: {
      label: "Home",
      fullName: "Demo Customer",
      phone: "9876500001",
      line1: "A-42, Sector 62",
      line2: "Near Metro Station",
      city: "Noida",
      state: "Uttar Pradesh",
      postalCode: "201309",
      country: "India",
      isDefault: true,
    },
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    password: "Priya@123",
    address: {
      label: "Home",
      fullName: "Priya Sharma",
      phone: "9876500002",
      line1: "204, Lotus Apartments",
      line2: "Andheri West",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400058",
      country: "India",
      isDefault: true,
    },
  },
  {
    name: "Rohan Mehta",
    email: "rohan.mehta@example.com",
    password: "Rohan@123",
    address: {
      label: "Home",
      fullName: "Rohan Mehta",
      phone: "9876500003",
      line1: "12, MG Road",
      line2: "Koramangala",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560095",
      country: "India",
      isDefault: true,
    },
  },
  {
    name: "Ananya Iyer",
    email: "ananya.iyer@example.com",
    password: "Ananya@123",
    address: {
      label: "Home",
      fullName: "Ananya Iyer",
      phone: "9876500004",
      line1: "7B, Anna Nagar",
      line2: "",
      city: "Chennai",
      state: "Tamil Nadu",
      postalCode: "600040",
      country: "India",
      isDefault: true,
    },
  },
  {
    name: "Vikram Singh",
    email: "vikram.singh@example.com",
    password: "Vikram@123",
    address: {
      label: "Home",
      fullName: "Vikram Singh",
      phone: "9876500005",
      line1: "56, Civil Lines",
      line2: "",
      city: "Jaipur",
      state: "Rajasthan",
      postalCode: "302006",
      country: "India",
      isDefault: true,
    },
  },
  {
    name: "Sneha Patel",
    email: "sneha.patel@example.com",
    password: "Sneha@123",
    address: {
      label: "Home",
      fullName: "Sneha Patel",
      phone: "9876500006",
      line1: "301, Silver Oak Society",
      line2: "Satellite",
      city: "Ahmedabad",
      state: "Gujarat",
      postalCode: "380015",
      country: "India",
      isDefault: true,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Coupons (matches the Coupon schema exactly, including usageLimit and
// expiresAt which the previous seed file never set)
// ─────────────────────────────────────────────────────────────────────────

const buildCoupons = () => {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  return [
    {
      code: "NEXA15",
      description: "15% off your order",
      type: "percent",
      value: 15,
      minOrderAmount: 0,
      maxDiscount: 3000,
      usageLimit: null,
      perUserLimit: null,
      isActive: true,
    },
    {
      code: "WELCOME10",
      description: "10% off for new customers",
      type: "percent",
      value: 10,
      minOrderAmount: 0,
      maxDiscount: 2000,
      usageLimit: null,
      perUserLimit: 1,
      isActive: true,
    },
    {
      code: "FESTIVE500",
      description: "Flat ₹500 off on orders above ₹3,000",
      type: "fixed",
      value: 500,
      minOrderAmount: 3000,
      maxDiscount: 0,
      usageLimit: 200,
      perUserLimit: 1,
      startsAt: now,
      expiresAt: in60Days,
      isActive: true,
    },
    {
      code: "FLASH20",
      description: "20% off flash sale — orders above ₹5,000",
      type: "percent",
      value: 20,
      minOrderAmount: 5000,
      maxDiscount: 2500,
      usageLimit: 50,
      perUserLimit: 1,
      startsAt: now,
      expiresAt: in30Days,
      isActive: true,
    },
  ];
};

// ─────────────────────────────────────────────────────────────────────────
// Products
// ─────────────────────────────────────────────────────────────────────────

// The catalogue itself lives in catalogue.js — each product carries its own
// images, specs, highlights and attributes there.
const products = catalogue;

const makeSku = (brand, name, i) => {
  const brandCode = brand.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "GEN";
  const nameCode = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase();
  return `${brandCode}-${nameCode}-${String(i + 1).padStart(3, "0")}`;
};

// ─────────────────────────────────────────────────────────────────────────
// Review content pools — realistic Indian-e-commerce-style comments.
// A 5-review-max cap per product keeps things inside the unique
// (product, user) index while still giving every product real feedback.
// ─────────────────────────────────────────────────────────────────────────

const FIVE_STAR = [
  "Bilkul paisa vasool! {product} use kar rahi hoon 3 hafte se aur build quality, performance sab kuch top notch hai.",
  "Excellent purchase. The {product} arrived well packed and works flawlessly — exactly as described on the listing.",
  "Best decision! {product} ki performance ne mujhe impress kar diya, delivery bhi time se pehle ho gayi thi.",
  "Highly recommend the {product} to anyone in this price range. Battery life and build quality exceeded expectations.",
  "Ekdum zabardast product hai. {product} ka packaging bhi premium tha aur setup 5 minute mein ho gaya.",
];

const FOUR_STAR = [
  "Overall very happy with the {product}. Performance is great, only wish the box included a few more accessories.",
  "Achha product hai, {product} smoothly chal raha hai. Thoda price zyada laga par quality justify karti hai.",
  "Good value for money. The {product} does everything it promises, minor learning curve for first-time users.",
  "Solid buy. {product} ka design premium hai, bas charging cable thoda chota diya hai company ne.",
];

const THREE_STAR = [
  "Decent product for the price, but {product} ki battery life expectation se thodi kam nikli.",
  "It's okay. The {product} works fine day-to-day, though customer support response was a bit slow.",
  "Average experience — {product} theek hai but delivery mein 2 extra din lag gaye.",
];

const REVIEW_RATING_WEIGHTS = [
  { rating: 5, pool: FIVE_STAR, weight: 5 },
  { rating: 4, pool: FOUR_STAR, weight: 3 },
  { rating: 3, pool: THREE_STAR, weight: 1 },
];

const pickWeightedRating = () => {
  const total = REVIEW_RATING_WEIGHTS.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const r of REVIEW_RATING_WEIGHTS) {
    if (roll < r.weight) return r;
    roll -= r.weight;
  }
  return REVIEW_RATING_WEIGHTS[0];
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// ─────────────────────────────────────────────────────────────────────────
// Order helpers
// ─────────────────────────────────────────────────────────────────────────

const STATUS_SEQUENCE = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const STATUS_NOTES = {
  pending: "Order placed, awaiting confirmation",
  confirmed: "Order confirmed by NexaMart",
  processing: "Order is being processed at the warehouse",
  packed: "Order packed and ready for dispatch",
  shipped: "Order handed over to courier partner",
  out_for_delivery: "Order out for delivery",
  delivered: "Order delivered successfully",
  cancelled: "Order cancelled",
  return_requested: "Customer requested a return",
};

// Build the trackingHistory array up to (and including) a given status,
// each event staggered a day apart starting from orderDate.
const buildTrackingHistory = (status, orderDate) => {
  const history = [];
  let dayOffset = 0;

  if (status === "cancelled") {
    history.push({ status: "pending", note: STATUS_NOTES.pending, timestamp: orderDate });
    history.push({
      status: "cancelled",
      note: STATUS_NOTES.cancelled,
      timestamp: new Date(orderDate.getTime() + 24 * 60 * 60 * 1000),
    });
    return history;
  }

  if (status === "return_requested") {
    for (const s of STATUS_SEQUENCE) {
      history.push({
        status: s,
        note: STATUS_NOTES[s],
        timestamp: new Date(orderDate.getTime() + dayOffset * 24 * 60 * 60 * 1000),
      });
      dayOffset += 1;
    }
    history.push({
      status: "return_requested",
      note: STATUS_NOTES.return_requested,
      timestamp: new Date(orderDate.getTime() + dayOffset * 24 * 60 * 60 * 1000),
    });
    return history;
  }

  const idx = STATUS_SEQUENCE.indexOf(status);
  const stopAt = idx === -1 ? STATUS_SEQUENCE.length - 1 : idx;
  for (let i = 0; i <= stopAt; i++) {
    history.push({
      status: STATUS_SEQUENCE[i],
      note: STATUS_NOTES[STATUS_SEQUENCE[i]],
      timestamp: new Date(orderDate.getTime() + i * 24 * 60 * 60 * 1000),
    });
  }
  return history;
};

// Build a full order document ready for Order.create().
const buildOrder = ({ user, itemsSpec, status, paymentMethod, couponCode, discountPercent, daysAgo }) => {
  const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  const items = itemsSpec.map(({ product, quantity }) => ({
    product: product._id,
    name: product.name,
    price: product.price,
    quantity,
  }));

  const itemsPrice = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const shippingPrice = itemsPrice >= 50000 ? 0 : 199;
  // Electronics prices here are treated as GST-inclusive; taxPrice is shown
  // purely as an informational breakdown of the 18% already inside itemsPrice.
  const taxPrice = Math.round(itemsPrice - itemsPrice / 1.18);
  const discountPrice = discountPercent ? Math.round(itemsPrice * discountPercent) : 0;
  const totalPrice = itemsPrice + shippingPrice - discountPrice;

  const trackingHistory = buildTrackingHistory(status, orderDate);
  const stockReduced = !["pending", "cancelled"].includes(status);
  const isDelivered = status === "delivered" || status === "return_requested";
  const deliveredAt = isDelivered
    ? trackingHistory.find((h) => h.status === "delivered")?.timestamp
    : undefined;

  const isPaid =
    paymentMethod === "razorpay" ? true : status === "delivered" || status === "return_requested";

  const order = {
    user: user._id,
    items,
    shippingAddress: {
      fullName: user.address.fullName,
      phone: user.address.phone,
      line1: user.address.line1,
      line2: user.address.line2,
      city: user.address.city,
      state: user.address.state,
      postalCode: user.address.postalCode,
      country: user.address.country,
    },
    itemsPrice,
    shippingPrice,
    taxPrice,
    discountPrice,
    couponCode: couponCode || "",
    totalPrice,
    paymentMethod,
    isPaid,
    status,
    stockReduced,
    trackingHistory,
    createdAt: orderDate,
  };

  if (isPaid) {
    order.paidAt = paymentMethod === "razorpay" ? orderDate : deliveredAt;
    if (paymentMethod === "razorpay") {
      order.paymentResult = {
        razorpayOrderId: `order_${Math.random().toString(36).slice(2, 12)}`,
        razorpayPaymentId: `pay_${Math.random().toString(36).slice(2, 12)}`,
        razorpaySignature: `sig_${Math.random().toString(36).slice(2, 20)}`,
        status: "captured",
      };
    }
  }
  if (deliveredAt) order.deliveredAt = deliveredAt;

  if (status === "return_requested") {
    order.returnInfo = {
      reason: "Item not as expected",
      description: "Product performance did not match what was advertised; requesting a return.",
      requestedAt: new Date(deliveredAt.getTime() + 2 * 24 * 60 * 60 * 1000),
    };
  }

  return order;
};

// ─────────────────────────────────────────────────────────────────────────
// Main seed function
// ─────────────────────────────────────────────────────────────────────────

export const seedDatabase = async ({ clear = true } = {}) => {
  if (clear) {
    console.log("Clearing existing data...");
    await User.deleteMany({});
    await Product.deleteMany({});
    await Review.deleteMany({});
    await Order.deleteMany({});
    await Coupon.deleteMany({});
  }

  // ── 1. Users ────────────────────────────────────────────────
  console.log("Creating users...");
  await User.create({
    name: "Admin",
    email: "admin@shop.com",
    password: "Admin@123",
    role: "admin",
    isVerified: true,
    status: "active",
  });

  const customers = [];
  for (const c of customerSeed) {
    const user = await User.create({
      name: c.name,
      email: c.email,
      password: c.password,
      role: "user",
      isVerified: true,
      status: "active",
      address: c.address,
      addresses: [c.address],
    });
    customers.push(user);
  }

  // ── 2. Products ───────────────────────────────────────────────
  // Photos are shipped with the frontend (public/images/products/…), so there
  // is nothing to reach over the network and nothing that can rot.
  console.log("Creating products...");
  const createdProducts = [];

  for (let i = 0; i < products.length; i++) {
    const { images: productImages, ...data } = products[i];
    const sku = makeSku(data.brand, data.name, i);

    // Each configuration gets its own SKU derived from the product SKU, so
    // stock and pricing are tracked per variant rather than per product.
    const variants = (variantsByProduct[data.name] || []).map((v) => ({
      ...v,
      sku: generateVariantSku(sku, v.attributes),
    }));

    // Keep the headline stock in sync with what the variants actually hold.
    const countInStock = variants.length
      ? variants.reduce((sum, v) => sum + v.countInStock, 0)
      : data.countInStock;

    const product = await Product.create({
      ...data,
      sku,
      status: "active",
      isActive: true,
      // Already full image objects, each tagged with the variant it depicts.
      images: productImages,
      variants,
      countInStock,
    });
    createdProducts.push(product);
  }

  // ── 3. Coupons ─────────────────────────────────────────────
  console.log("Creating coupons...");
  const createdCoupons = {};
  for (const c of buildCoupons()) {
    const coupon = await Coupon.create(c);
    createdCoupons[coupon.code] = coupon;
  }

  // ── 4. Reviews (real Review docs -> product rating recalculated
  //      automatically by the model's own post-save hook) ───────
  console.log("Creating reviews...");
  let reviewCount = 0;
  for (const product of createdProducts) {
    const reviewerCount = 2 + Math.floor(Math.random() * 4); // 2-5 reviews
    const reviewers = shuffle(customers).slice(0, reviewerCount);

    for (const reviewer of reviewers) {
      const { rating, pool } = pickWeightedRating();
      const template = pool[Math.floor(Math.random() * pool.length)];
      const comment = template.replace("{product}", product.name);

      await Review.create({
        product: product._id,
        user: reviewer._id,
        name: reviewer.name,
        rating,
        comment,
      });
      reviewCount += 1;
    }
  }

  // ── 5. Orders (varied statuses, payment methods, coupons) ─────
  console.log("Creating orders...");
  const byName = (name) => createdProducts.find((p) => p.name === name);

  const orderPlans = [
    {
      user: customers[0],
      itemsSpec: [{ product: byName("Apple iPhone 13 Pro"), quantity: 1 }],
      status: "delivered",
      paymentMethod: "razorpay",
      couponCode: "NEXA15",
      discountPercent: 0.15,
      daysAgo: 25,
    },
    {
      user: customers[0],
      itemsSpec: [{ product: byName("Apple AirPods (3rd Generation)"), quantity: 1 }],
      status: "pending",
      paymentMethod: "cod",
      daysAgo: 0,
    },
    {
      user: customers[1],
      itemsSpec: [
        { product: byName("Samsung Galaxy S10"), quantity: 1 },
        { product: byName("Apple MagSafe Battery Pack"), quantity: 1 },
      ],
      status: "shipped",
      paymentMethod: "razorpay",
      daysAgo: 3,
    },
    {
      user: customers[2],
      itemsSpec: [{ product: byName('Apple MacBook Pro 14" Space Grey'), quantity: 1 }],
      status: "confirmed",
      paymentMethod: "razorpay",
      couponCode: "WELCOME10",
      discountPercent: 0.1,
      daysAgo: 1,
    },
    {
      user: customers[3],
      itemsSpec: [{ product: byName("Apple AirPods Max Silver"), quantity: 1 }],
      status: "out_for_delivery",
      paymentMethod: "cod",
      daysAgo: 5,
    },
    {
      user: customers[4],
      itemsSpec: [{ product: byName("ASUS Zenbook Pro Duo"), quantity: 1 }],
      status: "processing",
      paymentMethod: "razorpay",
      couponCode: "FLASH20",
      discountPercent: 0.2,
      daysAgo: 2,
    },
    {
      user: customers[5],
      itemsSpec: [{ product: byName("Beats Flex Wireless Earphones"), quantity: 2 }],
      status: "packed",
      paymentMethod: "cod",
      daysAgo: 4,
    },
    {
      user: customers[1],
      itemsSpec: [{ product: byName("Apple iPad Mini (2021) Starlight"), quantity: 1 }],
      status: "cancelled",
      paymentMethod: "razorpay",
      daysAgo: 10,
    },
    {
      user: customers[2],
      itemsSpec: [{ product: byName("Apple Watch Series 4 Gold"), quantity: 1 }],
      status: "return_requested",
      paymentMethod: "cod",
      daysAgo: 15,
    },
    {
      user: customers[3],
      itemsSpec: [
        { product: byName("Apple 20W USB-C Power Adapter"), quantity: 1 },
        { product: byName("iPhone 12 Silicone Case with MagSafe — Plum"), quantity: 1 },
      ],
      status: "delivered",
      paymentMethod: "razorpay",
      couponCode: "FESTIVE500",
      daysAgo: 40,
    },
  ];

  let ordersCreated = 0;
  for (const plan of orderPlans) {
    const orderDoc = buildOrder(plan);
    await Order.create(orderDoc);
    ordersCreated += 1;

    // Reflect coupon usage on the coupon document, matching the schema's
    // usedBy/usedCount fields.
    if (plan.couponCode && createdCoupons[plan.couponCode]) {
      const coupon = createdCoupons[plan.couponCode];
      coupon.usedCount += 1;
      const existing = coupon.usedBy.find((u) => String(u.user) === String(plan.user._id));
      if (existing) {
        existing.count += 1;
      } else {
        coupon.usedBy.push({ user: plan.user._id, count: 1 });
      }
      await coupon.save();
    }
  }

  // ── Summary ─────────────────────────────────────────────────
  const featured = products.filter((p) => p.isFeatured).length;
  console.log("\nSeed complete!");
  console.log("  Admin login:      admin@shop.com / Admin@123");
  console.log("  Customer login:   user@shop.com  / User@123");
  console.log(`  Customers:        ${customers.length}`);
  console.log(`  Products:         ${createdProducts.length} (${featured} featured)`);
  const imageCount = createdProducts.reduce((n, p) => n + p.images.length, 0);
  console.log(`  Images:           ${imageCount} local product photos`);
  console.log(`  Reviews:          ${reviewCount} (product rating/numReviews auto-calculated)`);
  console.log(`  Orders:           ${ordersCreated} (covering pending → delivered, cod & razorpay)`);
  console.log(`  Coupons:          ${Object.keys(createdCoupons).length}`);

  return {
    products: createdProducts.length,
    reviews: reviewCount,
    orders: ordersCreated,
    coupons: Object.keys(createdCoupons).length,
  };
};