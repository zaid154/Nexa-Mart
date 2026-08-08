// One-off: refresh the stored email templates to the branded Flipkart-style
// defaults. Run once: node src/scripts/updateEmailTemplates.js
import "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import Settings from "../models/Settings.js";
import { EMAIL_TEMPLATES } from "../utils/emailTemplates.js";

const run = async () => {
  await connectDB();
  const s = await Settings.getSingleton();
  s.emailTemplates.otp = EMAIL_TEMPLATES.otp;
  s.emailTemplates.resetPassword = EMAIL_TEMPLATES.resetPassword;
  s.emailTemplates.orderConfirmation = EMAIL_TEMPLATES.orderConfirmation;
  s.markModified("emailTemplates");
  await s.save();
  console.log("Email templates updated to branded defaults.");
  await disconnectDB();
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
