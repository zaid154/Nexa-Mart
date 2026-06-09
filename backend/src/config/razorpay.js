import Razorpay from "razorpay";
import Settings from "../models/Settings.js";

export const getRazorpayKeys = async () => {
  const settings = await Settings.getSingleton();
  const keyId = settings.api?.razorpayKeyId || process.env.RAZORPAY_KEY_ID || "";
  const keySecret = settings.api?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || "";
  return { keyId, keySecret };
};

export const getRazorpay = async () => {
  const { keyId, keySecret } = await getRazorpayKeys();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys missing. Set them in Admin → Settings → API, or in .env");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};
