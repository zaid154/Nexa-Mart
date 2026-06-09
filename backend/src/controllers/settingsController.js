// This controller handles the admin Settings page
// (reading settings, updating them, and sending a test email).

import asyncHandler from "express-async-handler";
import Settings from "../models/Settings.js";
import { sendMail, maskSettings } from "../utils/email.js";
import { logActivity } from "../utils/logger.js";

// GET /api/admin/settings  - get all settings (with secrets masked).
export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({ settings: maskSettings(settings) });
});

// GET /api/admin/settings/public  - the few settings safe to show publicly.
export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  res.json({
    site: { name: settings.site.name, supportEmail: settings.site.supportEmail },
    social: settings.social,
  });
});

// PUT /api/admin/settings  - update the settings.
export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const { smtp, emailTemplates, site, company, security, api, social } = req.body;

  // Update SMTP fields one by one (only the ones that were sent).
  if (smtp) {
    if (smtp.host !== undefined) {
      settings.smtp.host = smtp.host;
    }
    if (smtp.port !== undefined) {
      settings.smtp.port = Number(smtp.port);
    }
    if (smtp.secure !== undefined) {
      settings.smtp.secure = smtp.secure;
    }
    if (smtp.user !== undefined) {
      settings.smtp.user = smtp.user;
    }
    // Only update the password if a real one was typed (not the masked stars).
    if (smtp.pass && smtp.pass !== "********") {
      settings.smtp.pass = smtp.pass;
    }
    if (smtp.from !== undefined) {
      settings.smtp.from = smtp.from;
    }
  }

  if (emailTemplates) {
    Object.assign(settings.emailTemplates, emailTemplates);
  }
  if (site) {
    Object.assign(settings.site, site);
  }
  if (company) {
    Object.assign(settings.company, company);
  }
  if (security) {
    Object.assign(settings.security, security);
  }

  // Update API keys (again, ignore the masked secret).
  if (api) {
    if (api.razorpayKeyId !== undefined) {
      settings.api.razorpayKeyId = api.razorpayKeyId;
    }
    if (api.razorpayKeySecret && api.razorpayKeySecret !== "********") {
      settings.api.razorpayKeySecret = api.razorpayKeySecret;
    }
  }

  if (social) {
    Object.assign(settings.social, social);
  }

  await settings.save();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "settings_updated",
    meta: { sections: Object.keys(req.body) },
    ip: req.ip,
  });

  res.json({ settings: maskSettings(settings), message: "Settings saved" });
});

// POST /api/admin/settings/test-email  - send a test email to check SMTP.
export const sendTestEmail = asyncHandler(async (req, res) => {
  const { to } = req.body;
  if (!to) {
    res.status(400);
    throw new Error("Recipient email is required");
  }

  await sendMail({
    to,
    subject: "NexaMart — Test email",
    html: "<p>This is a test email from NexaMart admin settings. SMTP is working correctly.</p>",
  });

  res.json({ message: `Test email sent to ${to}` });
});
