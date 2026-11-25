// Application-wide settings schema (singleton document).

import mongoose from "mongoose";
import { EMAIL_TEMPLATES } from "../services/emailTemplates.js";
import {
  DEFAULT_CATEGORY_TILES,
  DEFAULT_HERO_SLIDES,
  DEFAULT_PROMO_TILES,
  DEFAULT_COLLECTIONS,
  DEFAULT_TRUST_BADGES,
  DEFAULT_PRODUCT_OFFERS,
  DEFAULT_SERVICE_BADGES,
  DEFAULT_POPULAR_SEARCHES,
} from "../config/storefrontDefaultsConfig.js";

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
      // Default GST percentage for invoice calculations
      gstRate: { type: Number, default: 18 },
      // Authorised signatory image for invoices (data URL or URL)
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
    // Storefront promotional and layout content
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

    // Commerce business rules
    commerce: {
      currency: { type: String, default: "INR" },
      // Order subtotal tax rate percentage
      taxRatePercent: { type: Number, default: 18, min: 0, max: 100 },
      // Standard shipping fee
      shippingFee: { type: Number, default: 99, min: 0 },
      freeShippingThreshold: { type: Number, default: 5000, min: 0 },
      // Estimated delivery business day window
      deliveryDaysMin: { type: Number, default: 3, min: 0 },
      deliveryDaysMax: { type: Number, default: 5, min: 0 },
      // EMI calculation tenure in months
      emiMonths: { type: Number, default: 12, min: 1 },
      // Return policy eligibility window in days
      returnWindowDays: { type: Number, default: 7, min: 0 },
      // Low inventory notification threshold
      lowStockThreshold: { type: Number, default: 10, min: 0 },
      // Fulfillment seller display name
      sellerName: { type: String, default: "NexaMart Retail" },
      // Checkout payment gateway toggles
      codEnabled: { type: Boolean, default: true },
      onlinePaymentEnabled: { type: Boolean, default: true },
      // Minimum rating threshold for Assured badge
      assuredMinRating: { type: Number, default: 4, min: 0, max: 5 },
    },

    // Homepage layout sections
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
      // Product collections configuration
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

    // Product page promotional copy
    productPage: {
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
      // Service highlight badges
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

    // Storefront search configuration
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

// Retrieve singleton settings document including sensitive credentials
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
