import crypto from "crypto";

export const generateOtpCode = () => {
  const length = Number(process.env.OTP_LENGTH) || 6;
  const max = Math.pow(10, length);
  const num = crypto.randomInt(0, max);
  return String(num).padStart(length, "0");
};

export const getOtpExpiryMin = async () => {
  try {
    const Settings = (await import("../models/Settings.js")).default;
    const settings = await Settings.getSingleton();
    return settings.security.otpExpiryMin || Number(process.env.OTP_EXPIRES_MIN) || 10;
  } catch {
    return Number(process.env.OTP_EXPIRES_MIN) || 10;
  }
};
