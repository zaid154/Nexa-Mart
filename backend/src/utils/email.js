// Helpers for sending emails (OTP, order confirmation, test email).
// The SMTP settings come from the admin Settings, with .env as a fallback.

import nodemailer from "nodemailer";
import Settings from "../models/Settings.js";

// Replace {{name}}, {{otp}}, etc. inside an HTML template with real values.
const renderTemplate = (template, vars) => {
  let html = template || "";

  // Go through each variable and replace every {{key}} with its value.
  for (const [key, value] of Object.entries(vars)) {
    let safeValue = "";
    if (value !== undefined && value !== null) {
      safeValue = String(value);
    }
    html = html.replace(new RegExp(`{{${key}}}`, "g"), safeValue);
  }

  return html;
};

// Read the SMTP configuration from Settings (falling back to .env values).
const getSmtpConfig = async () => {
  const settings = await Settings.getSingleton();

  // For "secure", prefer the saved setting; if it is missing, use the .env value.
  let secure;
  if (settings.smtp.secure !== undefined && settings.smtp.secure !== null) {
    secure = settings.smtp.secure;
  } else {
    secure = process.env.SMTP_SECURE === "true";
  }

  return {
    host: settings.smtp.host || process.env.SMTP_HOST,
    port: settings.smtp.port || Number(process.env.SMTP_PORT) || 587,
    secure,
    user: settings.smtp.user || process.env.SMTP_USER,
    pass: settings.smtp.pass || process.env.SMTP_PASS,
    from: settings.smtp.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    siteName: settings.site.name || "NexaMart",
    templates: settings.emailTemplates,
    otpExpiryMin: settings.security.otpExpiryMin || Number(process.env.OTP_EXPIRES_MIN) || 10,
  };
};

// Build a nodemailer transport that can actually send mail.
export const createTransport = async () => {
  const cfg = await getSmtpConfig();

  // We need host, user and password to send an email.
  if (!cfg.host || !cfg.user || !cfg.pass) {
    throw new Error("SMTP is not configured. Set SMTP credentials in .env or Admin Settings.");
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
};

// Send a basic email with a subject and HTML body.
export const sendMail = async ({ to, subject, html }) => {
  const cfg = await getSmtpConfig();
  const transport = await createTransport();
  const from = cfg.from || cfg.user;
  await transport.sendMail({ from, to, subject, html });
};

// Send an OTP email. The template and subject depend on the purpose.
export const sendOtpEmail = async ({ to, name, otp, purpose = "verify" }) => {
  const cfg = await getSmtpConfig();

  // Pick the correct template and subject for verify vs reset.
  let template;
  let subject;
  if (purpose === "reset") {
    template = cfg.templates.resetPassword;
    subject = `${cfg.siteName} — Password reset code`;
  } else {
    template = cfg.templates.otp;
    subject = `${cfg.siteName} — Verify your email`;
  }

  const html = renderTemplate(template, {
    name: name || "there",
    otp,
    expiry: cfg.otpExpiryMin,
  });

  await sendMail({ to, subject, html });
};

// Send the "order confirmed" email.
export const sendOrderConfirmationEmail = async ({ to, name, orderId, total }) => {
  const cfg = await getSmtpConfig();

  const html = renderTemplate(cfg.templates.orderConfirmation, {
    name: name || "there",
    orderId,
    total,
  });

  await sendMail({
    to,
    subject: `${cfg.siteName} — Order confirmed`,
    html,
  });
};

// Hide secret values (passwords, keys) before sending settings to the client.
export const maskSettings = (settings) => {
  // Make a plain object copy we can safely change.
  let obj;
  if (settings.toObject) {
    obj = settings.toObject();
  } else {
    obj = { ...settings };
  }

  // Replace the SMTP password with stars (or empty if there is none).
  if (obj.smtp?.pass) {
    if (obj.smtp.pass) {
      obj.smtp.pass = "********";
    } else {
      obj.smtp.pass = "";
    }
  }

  // Replace the Razorpay secret with stars.
  if (obj.api?.razorpayKeySecret) {
    obj.api.razorpayKeySecret = "********";
  }

  return obj;
};
