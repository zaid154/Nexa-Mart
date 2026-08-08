// This file stores the site-wide admin Settings (SMTP, email templates,
// company info, security, API keys and social links).
// There is only ever ONE settings document in the database.

import mongoose from "mongoose";
import { EMAIL_TEMPLATES } from "../utils/emailTemplates.js";
import {
  DEFAULT_CATEGORY_TILES,
  DEFAULT_HERO_SLIDES,
  DEFAULT_PROMO_TILES,
  DEFAULT_COLLECTIONS,
  DEFAULT_TRUST_BADGES,
  DEFAULT_PRODUCT_OFFERS,
  DEFAULT_SERVICE_BADGES,
  DEFAULT_POPULAR_SEARCHES,
} from "../config/storefrontDefaults.js";

const settingsSchema = new mongoose.Schema(
  {
    smtp: {
      host: { type: String, default: "" },
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: { type: String, default: "" },
      pass: { type: String, default: "", select: false },
      from: { type: String, default: "" },
    },
    emailTemplates: {
      otp: { type: String, default: EMAIL_TEMPLATES.otp },
      resetPassword: { type: String, default: EMAIL_TEMPLATES.resetPassword },
      orderConfirmation: { type: String, default: EMAIL_TEMPLATES.orderConfirmation },
    },
    site: {
      name: { type: String, default: "NexaMart" },
      logo: { type: String, default: "" },
      supportEmail: { type: String, default: "trendykart.app@gmail.com" },
    },
    company: {
      name: { type: String, default: "NexaMart Electronics Pvt Ltd" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
      // GST percentage applied to orders and shown (split CGST/SGST) on invoices.
      gstRate: { type: Number, default: 18 },
      // Authorised-signatory image for invoices (base64 data URL or URL).
      signature: { type: String, default: "" },
    },
    security: {
      otpExpiryMin: { type: Number, default: 10 },
      maxLoginAttempts: { type: Number, default: 5 },
    },
    api: {
      razorpayKeyId: { type: String, default: "" },
      razorpayKeySecret: { type: String, default: "", select: false },
      razorpayWebhookSecret: { type: String, default: "", select: false },
    },
    social: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
      linkedin: { type: String, default: "https://www.linkedin.com/in/mohd-zaid-794090231/" },
      whatsapp: { type: String, default: "" },
      github: { type: String, default: "https://github.com/zaid154" },
    },
    // Storefront content the admin can edit: product-page benefit bullets and
    // the footer tagline / credit line.
    storefront: {
      productBenefits: {
        type: [String],
        default: [
          "Free delivery in 3–5 business days",
          "1 year manufacturer warranty",
          "7-day easy returns",
          "100% secure payment",
        ],
      },
      footerTagline: {
        type: String,
        default:
          "Your destination for premium electronics. Genuine products, secure payments, and fast delivery across India.",
      },
      footerCredit: { type: String, default: "Created by Mohd Zaid" },
      footerAddress: {
        type: String,
        default: "Tower B, Tech Park, Andheri East,\nMumbai, Maharashtra 400093, India",
      },
    },

    // ── Commerce rules ───────────────────────────────────────────────
    // Every price the shopper sees is derived from these numbers. The API is
    // the single source of truth: the cart, the checkout and the order all
    // read the same values, so changing one here changes them everywhere.
    commerce: {
      currency: { type: String, default: "INR" },
      // Tax charged on the discounted order subtotal.
      taxRatePercent: { type: Number, default: 18, min: 0, max: 100 },
      // Delivery fee, waived once the order reaches the threshold.
      shippingFee: { type: Number, default: 99, min: 0 },
      freeShippingThreshold: { type: Number, default: 5000, min: 0 },
      // Shown as "Delivery in X-Y business days" and used for date estimates.
      deliveryDaysMin: { type: Number, default: 3, min: 0 },
      deliveryDaysMax: { type: Number, default: 5, min: 0 },
      // How many months the "No Cost EMI from ₹X/month" figure is spread over.
      emiMonths: { type: Number, default: 12, min: 1 },
      // Return window advertised on the product page.
      returnWindowDays: { type: Number, default: 7, min: 0 },
      // Stock at or below this shows the "Hurry, only N left!" warning.
      lowStockThreshold: { type: Number, default: 10, min: 0 },
      // Who the storefront says fulfils the order.
      sellerName: { type: String, default: "NexaMart Retail" },
      // Payment methods offered at checkout.
      codEnabled: { type: Boolean, default: true },
      onlinePaymentEnabled: { type: Boolean, default: true },
      // Minimum rating for a product to earn the "Assured" badge.
      assuredMinRating: { type: Number, default: 4, min: 0, max: 5 },
    },

    // ── Home page content ────────────────────────────────────────────
    // Each section is a list the admin can reorder, extend or empty. An empty
    // list simply hides that section — no code change needed.
    homepage: {
      categoryTiles: {
        type: [
          {
            _id: false,
            name: String,
            link: String,
            image: String,
          },
        ],
        default: () => DEFAULT_CATEGORY_TILES,
      },
      heroSlides: {
        type: [
          {
            _id: false,
            badge: String,
            title: String,
            price: String,
            note: String,
            image: String,
            link: String,
            theme: { type: String, default: "blue" },
          },
        ],
        default: () => DEFAULT_HERO_SLIDES,
      },
      promoTiles: {
        type: [
          {
            _id: false,
            title: String,
            subtitle: String,
            image: String,
            link: String,
          },
        ],
        default: () => DEFAULT_PROMO_TILES,
      },
      // Horizontal product rails. `query` is a category name, `sort` an API
      // sort key; `featured` pulls the featured products instead.
      collections: {
        type: [
          {
            _id: false,
            title: String,
            category: String,
            sort: { type: String, default: "newest" },
            featured: { type: Boolean, default: false },
          },
        ],
        default: () => DEFAULT_COLLECTIONS,
      },
      trustBadges: {
        type: [
          {
            _id: false,
            icon: { type: String, default: "star" },
            title: String,
            subtitle: String,
          },
        ],
        default: () => DEFAULT_TRUST_BADGES,
      },
      couponStrip: {
        enabled: { type: Boolean, default: true },
        text: { type: String, default: "Extra 15% savings with NexaMart Plus!" },
        code: { type: String, default: "NEXA15" },
        ctaLabel: { type: String, default: "Claim Discount" },
        ctaLink: { type: String, default: "/products" },
      },
    },

    // ── Product page content ─────────────────────────────────────────
    productPage: {
      // The "Available offers" list. Purely promotional copy.
      offers: {
        type: [
          {
            _id: false,
            label: String,
            text: String,
          },
        ],
        default: () => DEFAULT_PRODUCT_OFFERS,
      },
      // Icons shown in the services strip under the price block.
      serviceBadges: {
        type: [
          {
            _id: false,
            icon: { type: String, default: "shield" },
            text: String,
          },
        ],
        default: () => DEFAULT_SERVICE_BADGES,
      },
    },

    // ── Search ───────────────────────────────────────────────────────
    search: {
      popularSearches: { type: [String], default: () => DEFAULT_POPULAR_SEARCHES },
      placeholder: {
        type: String,
        default: "Search for products, brands and more...",
      },
    },
  },
  { timestamps: true }
);

// Get the single settings document. If it does not exist yet, create it.
// We also select the hidden fields (smtp.pass and razorpayKeySecret).
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne().select(
    "+smtp.pass +api.razorpayKeySecret +api.razorpayWebhookSecret"
  );
  if (!doc) {
    doc = await this.create({});
  } else if (doc.homepage?.categoryTiles?.some((t) => t.image?.endsWith("/1.webp"))) {
    doc.homepage.categoryTiles = DEFAULT_CATEGORY_TILES;
    await doc.save();
  }
  return doc;
};

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
