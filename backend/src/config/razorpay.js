// This file gives us the Razorpay payment client and the API keys.
// The keys can come from the admin Settings page, or from the .env file.

import Razorpay from "razorpay";
import Settings from "../models/Settings.js";

// Get the Razorpay key id and secret.
// First we check the saved Settings, then we fall back to the .env values.
export const getRazorpayKeys = async () => {
  const settings = await Settings.getSingleton();

  const keyId = settings.api?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = settings.api?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";

  return { keyId, keySecret };
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
