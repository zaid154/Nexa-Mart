import nodemailer from "nodemailer";
import Settings from "../models/settingsModel.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 15000;

const renderTemplate = (template = "", vars = {}) =>
  Object.entries(vars).reduce(
    (html, [key, val]) => html.replace(new RegExp(`{{${key}}}`, "g"), val ?? ""),
    template
  );

const getSmtpConfig = async () => {
  const settings = await Settings.getSingleton();
  const smtp = settings.smtp || {};
  return {
    host: smtp.host || process.env.SMTP_HOST,
    port: smtp.port || Number(process.env.SMTP_PORT) || 587,
    secure: smtp.secure ?? (process.env.SMTP_SECURE === "true"),
    user: smtp.user || process.env.SMTP_USER,
    pass: smtp.pass || process.env.SMTP_PASS,
    from: smtp.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    brevoKey: process.env.BREVO_API_KEY || "",
    siteName: settings.site?.name || "NexaMart",
    templates: settings.emailTemplates || {},
    otpExpiryMin: settings.security?.otpExpiryMin || Number(process.env.OTP_EXPIRES_MIN) || 10,
  };
};

const sendViaBrevo = async (cfg, { to, subject, html }) => {
  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: { "api-key": cfg.brevoKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { name: cfg.siteName, email: cfg.user },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo rejected email (${res.status}): ${detail}`);
  }
};

export const createTransport = async () => {
  const cfg = await getSmtpConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    throw new Error("SMTP is not configured in .env or Settings.");
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  });
};

export const sendMail = async ({ to, subject, html }) => {
  const cfg = await getSmtpConfig();
  if (cfg.host && cfg.user && cfg.pass) {
    try {
      const transport = await createTransport();
      await transport.sendMail({ from: cfg.from || `NexaMart <${cfg.user}>`, to, subject, html });
      return;
    } catch (err) {
      if (cfg.brevoKey) return sendViaBrevo(cfg, { to, subject, html });
      throw err;
    }
  }
  if (cfg.brevoKey) return sendViaBrevo(cfg, { to, subject, html });
  throw new Error("No valid email transport configured.");
};

export const sendOtpEmail = async ({ to, name, otp, purpose = "verify" }) => {
  const cfg = await getSmtpConfig();
  const isReset = purpose === "reset";
  const template = isReset ? cfg.templates.resetPassword : cfg.templates.otp;
  const subject = `${cfg.siteName} — ${isReset ? "Password reset code" : "Verify your email"}`;
  const html = renderTemplate(template, { name: name || "there", otp, expiry: cfg.otpExpiryMin });
  await sendMail({ to, subject, html });
};

export const sendOtpEmailInBackground = (options) => {
  sendOtpEmail(options).catch((err) =>
    console.error(`[email] Failed to send ${options.purpose || "verify"} OTP to ${options.to}:`, err.message)
  );
};

export const sendOrderConfirmationEmail = async ({ to, name, orderId, total }) => {
  const cfg = await getSmtpConfig();
  const html = renderTemplate(cfg.templates.orderConfirmation, {
    name: name || "there",
    orderId,
    total,
    totalAmount: total,
  });
  await sendMail({ to, subject: `${cfg.siteName} — Order confirmed`, html });
};
