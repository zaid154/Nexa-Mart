// This file gives us the Razorpay payment client and the API keys.
// The keys can come from the admin Settings page, or from the .env file.

import Razorpay from "razorpay";
import Settings from "../models/Settings.js";

// Every Razorpay key id looks like rzp_test_xxx or rzp_live_xxx.
//
// This check exists because the Settings page once ended up holding an email
// address and a password in these two fields — browser autofill filled the
// admin login into them and they were saved. Settings take priority over .env,
// so those junk values silently overrode the real keys and every payment failed
// with "Authentication failed". Anything that is not shaped like a key is
// ignored rather than trusted.
export const isValidRazorpayKeyId = (value) => /^rzp_(test|live)_[A-Za-z0-9]+$/.test(String(value || "").trim());

// Get the Razorpay key id and secret.
// First we check the saved Settings, then we fall back to the .env values.
export const getRazorpayKeys = async () => {
  const settings = await Settings.getSingleton();

  const savedId = String(settings.api?.razorpayKeyId || "").trim();
  const savedSecret = String(settings.api?.razorpayKeySecret || "").trim();

  // Only use the saved pair when the id is genuinely a Razorpay key and a
  // secret is present alongside it. A half-filled pair falls back to .env too.
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

// Get the Razorpay webhook secret (used to verify incoming webhook calls).
// Like the keys, it can come from Settings or from the .env file.
export const getRazorpayWebhookSecret = async () => {
  const settings = await Settings.getSingleton();
  return settings.api?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET || "";
};

// Build a Razorpay client using the keys above.
export const getRazorpay = async () => {
  const { keyId, keySecret } = await getRazorpayKeys();

  // We cannot make payments without both keys.
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys missing. Set them in Admin → Settings → API, or in .env");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// Refund a Razorpay payment. amountPaise is the amount in paise (so ₹100 = 10000).
// Returns the Razorpay refund object (with id and status).
export const createRefund = async (paymentId, amountPaise, notes = {}) => {
  const razorpay = await getRazorpay();
  return razorpay.payments.refund(paymentId, {
    amount: amountPaise,
    speed: "normal",
    notes,
  });
};
