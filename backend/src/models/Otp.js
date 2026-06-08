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

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, purpose: 1 });

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

otpSchema.methods.verifyCode = async function (code) {
  if (this.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (this.attempts >= 5) return { ok: false, reason: "max_attempts" };
  this.attempts += 1;
  await this.save();
  const match = await bcrypt.compare(code, this.codeHash);
  return match ? { ok: true } : { ok: false, reason: "invalid" };
};

const Otp = mongoose.model("Otp", otpSchema);
export default Otp;
