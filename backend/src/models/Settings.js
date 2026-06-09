// This file stores the site-wide admin Settings (SMTP, email templates,
// company info, security, API keys and social links).
// There is only ever ONE settings document in the database.

import mongoose from "mongoose";

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
      otp: {
        type: String,
        default:
          "<h2>Verify your email</h2><p>Hi {{name}},</p><p>Your verification code is <strong>{{otp}}</strong>. It expires in {{expiry}} minutes.</p>",
      },
      resetPassword: {
        type: String,
        default:
          "<h2>Reset your password</h2><p>Hi {{name}},</p><p>Your password reset code is <strong>{{otp}}</strong>. It expires in {{expiry}} minutes.</p>",
      },
      orderConfirmation: {
        type: String,
        default:
          "<h2>Order confirmed</h2><p>Hi {{name}},</p><p>Your order #{{orderId}} for {{total}} has been confirmed.</p>",
      },
    },
    site: {
      name: { type: String, default: "NexaMart" },
      logo: { type: String, default: "" },
      supportEmail: { type: String, default: "" },
    },
    company: {
      name: { type: String, default: "NexaMart Electronics Pvt Ltd" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
    },
    security: {
      otpExpiryMin: { type: Number, default: 10 },
      maxLoginAttempts: { type: Number, default: 5 },
    },
    api: {
      razorpayKeyId: { type: String, default: "" },
      razorpayKeySecret: { type: String, default: "", select: false },
    },
    social: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Get the single settings document. If it does not exist yet, create it.
// We also select the hidden fields (smtp.pass and razorpayKeySecret).
settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne().select("+smtp.pass +api.razorpayKeySecret");
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

const Settings = mongoose.model("Settings", settingsSchema);
export default Settings;
