// Helpers for sending emails (OTP, order confirmation, test email).
// The SMTP settings come from the admin Settings, with .env as a fallback.
//
// Render's free tier blocks the SMTP ports, so when BREVO_API_KEY is set we
// send over Brevo's HTTPS API instead. Without the key we use SMTP as before.

import nodemailer from "nodemailer";
import Settings from "../models/Settings.js";

// Brevo's "send a transactional email" endpoint.
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Give up on a slow send instead of hanging the request that is waiting on us.
const SEND_TIMEOUT_MS = 15000;

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
    brevoKey: process.env.BREVO_API_KEY || "",
    siteName: settings.site.name || "NexaMart",
    templates: settings.emailTemplates,
    otpExpiryMin: settings.security.otpExpiryMin || Number(process.env.OTP_EXPIRES_MIN) || 10,
  };
};

// Send one email through the Brevo HTTP API (port 443, never blocked).
// The sender is SMTP_USER — the same address you verify in Brevo.
const sendViaBrevo = async (cfg, { to, subject, html }) => {
  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": cfg.brevoKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: cfg.siteName, email: cfg.user },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Brevo rejected the email (${response.status}): ${detail}`);
  }
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
    // Without these, a blocked SMTP port leaves the connection hanging for
    // about two minutes. Fail quickly instead so the caller can report it.
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });
};

// Send a basic email with a subject and HTML body.
// Uses the Brevo HTTP API when a key is configured, otherwise plain SMTP.
export const sendMail = async ({ to, subject, html }) => {
  const cfg = await getSmtpConfig();

  if (cfg.brevoKey) {
    await sendViaBrevo(cfg, { to, subject, html });
    return;
  }

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

// Start sending an OTP email but do not make the caller wait for it.
// Some routes must answer quickly and must not fail just because the mail
// provider is slow or down (the account is already created by then, and a
// thrown error would leave the user unable to retry). Anyone who does not get
// the code can request a new one from the resend-otp route.
export const sendOtpEmailInBackground = (options) => {
  sendOtpEmail(options).catch((error) => {
    const purpose = options.purpose || "verify";
    console.error(`Could not send ${purpose} OTP to ${options.to}: ${error.message}`);
  });
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

  // Replace the Razorpay webhook secret with stars.
  if (obj.api?.razorpayWebhookSecret) {
    obj.api.razorpayWebhookSecret = "********";
  }

  return obj;
};
