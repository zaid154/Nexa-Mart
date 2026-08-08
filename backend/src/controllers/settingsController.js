// This controller handles the admin Settings page
// (reading settings, updating them, and sending a test email).

import asyncHandler from "express-async-handler";
import Settings from "../models/Settings.js";
import { sendMail, maskSettings } from "../utils/email.js";
import { logActivity } from "../utils/logger.js";
import { isValidRazorpayKeyId } from "../config/razorpay.js";

// GET /api/admin/settings  - get all settings (with secrets masked).
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({ settings: maskSettings(settings) });
});

// GET /api/admin/settings/public  - everything the storefront needs to render
// itself: branding, commerce rules and the editable page content. The client
// reads this once at start-up, so no price rule or piece of copy has to be
// duplicated in the frontend code.
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({
    site: { name: settings.site.name, supportEmail: settings.site.supportEmail },
    social: settings.social,
    storefront: settings.storefront,
    commerce: settings.commerce,
    homepage: settings.homepage,
    productPage: settings.productPage,
    search: settings.search,
  });
});

// GET /api/admin/settings/invoice - company + signature for invoices (public).
// Kept separate from /public so the (potentially large) signature image is not
// loaded on every page by the footer.
export const getInvoiceSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({
    company: {
      name: settings.company.name,
      address: settings.company.address,
      gstin: settings.company.gstin,
      gstRate: settings.company.gstRate ?? 18,
    },
    signature: settings.company.signature || "",
  });
});

// PUT /api/admin/settings  - update the settings.
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const {
    smtp,
    emailTemplates,
    site,
    company,
    security,
    api,
    social,
    storefront,
    commerce,
    homepage,
    productPage,
    search,
  } = req.body;

  // Update SMTP fields one by one (only the ones that were sent).
  if (smtp) {
    if (smtp.host !== undefined) {
      settings.smtp.host = smtp.host;
    }
    if (smtp.port !== undefined) {
      settings.smtp.port = Number(smtp.port);
    }
    if (smtp.secure !== undefined) {
      settings.smtp.secure = smtp.secure;
    }
    if (smtp.user !== undefined) {
      settings.smtp.user = smtp.user;
    }
    // Only update the password if a real one was typed (not the masked stars).
    if (smtp.pass && smtp.pass !== "********") {
      settings.smtp.pass = smtp.pass;
    }
    if (smtp.from !== undefined) {
      settings.smtp.from = smtp.from;
    }
  }

  if (emailTemplates) {
    Object.assign(settings.emailTemplates, emailTemplates);
  }
  if (site) {
    Object.assign(settings.site, site);
  }
  if (company) {
    Object.assign(settings.company, company);
  }
  if (security) {
    Object.assign(settings.security, security);
  }

  // Update API keys (again, ignore the masked secrets).
  if (api) {
    if (api.razorpayKeyId !== undefined) {
      const keyId = String(api.razorpayKeyId).trim();

      // Reject anything that is not a Razorpay key id. This field once ended up
      // holding an admin email address (autofill), which then overrode the real
      // keys from .env and broke every payment with "Authentication failed".
      // An empty value is allowed: it means "fall back to the .env keys".
      if (keyId && !isValidRazorpayKeyId(keyId)) {
        res.status(400);
        throw new Error(
          "Razorpay Key ID must look like rzp_test_xxxx or rzp_live_xxxx. " +
            "Leave it blank to use the key from the server's .env file."
        );
      }

      settings.api.razorpayKeyId = keyId;
    }
    if (api.razorpayKeySecret && api.razorpayKeySecret !== "********") {
      settings.api.razorpayKeySecret = api.razorpayKeySecret;
    }
    if (api.razorpayWebhookSecret && api.razorpayWebhookSecret !== "********") {
      settings.api.razorpayWebhookSecret = api.razorpayWebhookSecret;
    }
  }

  if (social) {
    Object.assign(settings.social, social);
  }

  if (storefront) {
    settings.storefront = settings.storefront || {};
    if (Array.isArray(storefront.productBenefits)) {
      settings.storefront.productBenefits = storefront.productBenefits
        .filter((b) => typeof b === "string" && b.trim())
        .slice(0, 8);
    }
    if (typeof storefront.footerTagline === "string") {
      settings.storefront.footerTagline = storefront.footerTagline;
    }
    if (typeof storefront.footerCredit === "string") {
      settings.storefront.footerCredit = storefront.footerCredit;
    }
    if (typeof storefront.footerAddress === "string") {
      settings.storefront.footerAddress = storefront.footerAddress;
    }
    settings.markModified("storefront");
  }

  // Commerce rules — numbers are clamped so a typo cannot produce a negative
  // fee or a tax rate above 100%.
  if (commerce) {
    const num = (value, min, max) => {
      const n = Number(value);
      if (Number.isNaN(n)) {
        return null;
      }
      return Math.min(Math.max(n, min), max);
    };

    const numericFields = {
      taxRatePercent: [0, 100],
      shippingFee: [0, 100000],
      freeShippingThreshold: [0, 10000000],
      deliveryDaysMin: [0, 60],
      deliveryDaysMax: [0, 60],
      emiMonths: [1, 60],
      returnWindowDays: [0, 365],
      lowStockThreshold: [0, 10000],
      assuredMinRating: [0, 5],
    };

    for (const [field, [min, max]] of Object.entries(numericFields)) {
      if (commerce[field] !== undefined) {
        const value = num(commerce[field], min, max);
        if (value !== null) {
          settings.commerce[field] = value;
        }
      }
    }
    if (typeof commerce.sellerName === "string") {
      settings.commerce.sellerName = commerce.sellerName;
    }
    if (typeof commerce.currency === "string") {
      settings.commerce.currency = commerce.currency;
    }
    if (commerce.codEnabled !== undefined) {
      settings.commerce.codEnabled = Boolean(commerce.codEnabled);
    }
    if (commerce.onlinePaymentEnabled !== undefined) {
      settings.commerce.onlinePaymentEnabled = Boolean(commerce.onlinePaymentEnabled);
    }
    settings.markModified("commerce");
  }

  // Page content — each section is replaced wholesale by whatever the admin
  // saved, so removing an entry removes it from the storefront.
  if (homepage) {
    for (const key of ["categoryTiles", "heroSlides", "promoTiles", "collections", "trustBadges"]) {
      if (Array.isArray(homepage[key])) {
        settings.homepage[key] = homepage[key];
      }
    }
    if (homepage.couponStrip) {
      Object.assign(settings.homepage.couponStrip, homepage.couponStrip);
    }
    settings.markModified("homepage");
  }

  if (productPage) {
    if (Array.isArray(productPage.offers)) {
      settings.productPage.offers = productPage.offers;
    }
    if (Array.isArray(productPage.serviceBadges)) {
      settings.productPage.serviceBadges = productPage.serviceBadges;
    }
    settings.markModified("productPage");
  }

  if (search) {
    if (Array.isArray(search.popularSearches)) {
      settings.search.popularSearches = search.popularSearches
        .filter((s) => typeof s === "string" && s.trim())
        .slice(0, 12);
    }
    if (typeof search.placeholder === "string") {
      settings.search.placeholder = search.placeholder;
    }
    settings.markModified("search");
  }

  await settings.save();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "settings_updated",
    meta: { sections: Object.keys(req.body) },
    ip: req.ip,
  });

  res.json({ settings: maskSettings(settings), message: "Settings saved" });
});

// POST /api/admin/settings/test-email  - send a test email to check SMTP.
export const sendTestEmail = asyncHandler(async (req, res) => {
  const { to } = req.body;
  if (!to) {
    res.status(400);
    throw new Error("Recipient email is required");
  }

  await sendMail({
    to,
    subject: "NexaMart — Test email",
    html: "<p>This is a test email from NexaMart admin settings. SMTP is working correctly.</p>",
  });

  res.json({ message: `Test email sent to ${to}` });
});
