// Razorpay client and credential resolution.

import Razorpay from "razorpay";
import Settings from "../models/settingsModel.js";

// Validate key format (rzp_test_xxx or rzp_live_xxx) to prevent invalid values from overriding env.
export const isValidRazorpayKeyId = (value) => /^rzp_(test|live)_[A-Za-z0-9]+$/.test(String(value || "").trim());

// Resolve Razorpay credentials from Settings singleton with fallback to environment variables.
export const getRazorpayKeys = async () => {
  const settings = await Settings.getSingleton();

  const savedId = String(settings.api?.razorpayKeyId || "").trim();
  const savedSecret = String(settings.api?.razorpayKeySecret || "").trim();

  // Use saved database credentials only if both key ID format and secret are valid.
  const useSaved = isValidRazorpayKeyId(savedId) && savedSecret.length > 0;

  if (!useSaved && savedId) {
    console.warn(
      "[razorpay] Ignoring the key saved in Admin → Settings → API: " +
        `"${savedId.slice(0, 6)}…" is not a Razorpay key id. Using the .env keys instead.`
    );
  }

  return {
    keyId: useSaved ? savedId : process.env.RAZORPAY_KEY_ID || "",
    keySecret: useSaved ? savedSecret : process.env.RAZORPAY_KEY_SECRET || "",
  };
};

// Resolve Razorpay webhook secret from Settings or environment variables.
export const getRazorpayWebhookSecret = async () => {
  const settings = await Settings.getSingleton();
  return settings.api?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
};

// Initialize Razorpay instance with resolved credentials.
export const getRazorpay = async () => {
  const { keyId, keySecret } = await getRazorpayKeys();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys missing. Set them in Admin → Settings → API, or in .env");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// Process refund through Razorpay API (amount in paise).
export const createRefund = async (paymentId, amountPaise, notes = {}) => {
  const razorpay = await getRazorpay();
  return razorpay.payments.refund(paymentId, {
    amount: amountPaise,
    speed: "normal",
    notes,
  });
};
