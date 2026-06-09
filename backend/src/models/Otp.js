// This file describes how an OTP (one-time password) is stored.
// The code is saved as a hash so the real number is never kept in plain text.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ["verify", "reset"], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// MongoDB will automatically delete an OTP once it expires.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 });

// Create a new OTP. Any old OTPs for this email + purpose are removed first.
otpSchema.statics.createOtp = async function (email, code, purpose, expiresMin) {
  const codeHash = await bcrypt.hash(code, 10);
  await this.deleteMany({ email, purpose });

  return this.create({
    email,
    codeHash,
    purpose,
    expiresAt: new Date(Date.now() + expiresMin * 60 * 1000),
  });
};

// Check whether the typed code matches this OTP.
otpSchema.methods.verifyCode = async function (code) {
  // The OTP must not be expired.
  if (this.expiresAt < new Date()) {
    return { ok: false, reason: "expired" };
  }

  // Block after too many wrong tries.
  if (this.attempts >= 5) {
    return { ok: false, reason: "max_attempts" };
  }

  // Count this attempt and save it.
  this.attempts += 1;
  await this.save();

  // Compare the typed code with the stored hash.
  const match = await bcrypt.compare(code, this.codeHash);
  if (match) {
    return { ok: true };
  } else {
    return { ok: false, reason: "invalid" };
  }
};

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;
