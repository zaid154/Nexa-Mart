// Helpers for OTP (one-time password) codes.

import crypto from "crypto";

// Make a random numeric OTP code, padded with zeros to the correct length.
export const generateOtpCode = () => {
  const length = Number(process.env.OTP_LENGTH) || 6;
  const max = Math.pow(10, length);
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, "0");
};

// Find how many minutes an OTP should stay valid.
// We try the admin Settings first, then the .env value, then 10 minutes.
export const getOtpExpiryMin = async () => {
  try {
    const Settings = (await import("../models/Settings.js")).default;
    const settings = await Settings.getSingleton();
    return settings.security.otpExpiryMin || Number(process.env.OTP_EXPIRES_MIN) || 10;
  } catch {
    return Number(process.env.OTP_EXPIRES_MIN) || 10;
  }
};
