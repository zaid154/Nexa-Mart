import nodemailer from "nodemailer";
import Settings from "../models/Settings.js";

const renderTemplate = (template, vars) => {
  let html = template || "";
  Object.entries(vars).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), String(value ?? ""));
  });
  return html;
};

const getSmtpConfig = async () => {
  const settings = await Settings.getSingleton();
  return {
    host: settings.smtp.host || process.env.SMTP_HOST,
    port: settings.smtp.port || Number(process.env.SMTP_PORT) || 587,
    secure: settings.smtp.secure ?? process.env.SMTP_SECURE === "true",
    user: settings.smtp.user || process.env.SMTP_USER,
    pass: settings.smtp.pass || process.env.SMTP_PASS,
    from: settings.smtp.from || process.env.SMTP_FROM || process.env.SMTP_USER,
    siteName: settings.site.name || "NexaMart",
    templates: settings.emailTemplates,
    otpExpiryMin: settings.security.otpExpiryMin || Number(process.env.OTP_EXPIRES_MIN) || 10,
  };
};

export const createTransport = async () => {
  const cfg = await getSmtpConfig();
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

export const sendMail = async ({ to, subject, html }) => {
  const cfg = await getSmtpConfig();
  const transport = await createTransport();
  const from = cfg.from || cfg.user;
  await transport.sendMail({ from, to, subject, html });
};

export const sendOtpEmail = async ({ to, name, otp, purpose = "verify" }) => {
  const cfg = await getSmtpConfig();
  const template =
    purpose === "reset" ? cfg.templates.resetPassword : cfg.templates.otp;
  const html = renderTemplate(template, {
    name: name || "there",
    otp,
    expiry: cfg.otpExpiryMin,
  });
  const subject =
    purpose === "reset"
      ? `${cfg.siteName} — Password reset code`
      : `${cfg.siteName} — Verify your email`;
  await sendMail({ to, subject, html });
};

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

export const maskSettings = (settings) => {
  const obj = settings.toObject ? settings.toObject() : { ...settings };
  if (obj.smtp?.pass) obj.smtp.pass = obj.smtp.pass ? "********" : "";
  if (obj.api?.razorpayKeySecret) obj.api.razorpayKeySecret = "********";
  return obj;
};
