import nodemailer from "nodemailer";
import Settings from "../models/settingsModel.js";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_SENDERS_URL = "https://api.brevo.com/v3/senders";
const SMTP_TIMEOUT_MS = 10000;
const BREVO_TIMEOUT_MS = 10000;
const DEFAULT_BREVO_SENDER = "zaidm1323@gmail.com";

let cachedBrevoSender = null; // { apiKey, email, expiresAt }

const renderTemplate = (template = "", vars = {}) =>
  Object.entries(vars).reduce(
    (html, [key, val]) => html.replace(new RegExp(`{{${key}}}`, "g"), val ?? ""),
    template
  );

const stripHtml = (html = "") =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getEmailConfig = async () => {
  const settings = await Settings.getSingleton();
  const smtp = settings.smtp || {};
  return {
    host: (smtp.host || process.env.SMTP_HOST || "").trim(),
    port: smtp.port || Number(process.env.SMTP_PORT) || 587,
    secure: smtp.secure ?? (process.env.SMTP_SECURE === "true"),
    user: (smtp.user || process.env.SMTP_USER || "").trim(),
    pass: (smtp.pass || process.env.SMTP_PASS || "").trim(),
    from: (smtp.from || process.env.SMTP_FROM || process.env.SMTP_USER || "").trim(),
    brevoKey: (process.env.BREVO_API_KEY || "").trim(),
    brevoSender: (process.env.BREVO_SENDER_EMAIL || "").trim(),
    siteName: (settings.site?.name || "NexaMart").trim(),
    templates: settings.emailTemplates || {},
    otpExpiryMin: settings.security?.otpExpiryMin || Number(process.env.OTP_EXPIRES_MIN) || 10,
  };
};

/**
 * Resolve a verified sender email registered in the Brevo account.
 * Using an unverified address (such as an SMTP-only Gmail alias) makes Brevo
 * accept the HTTP request (201) and then silently drop delivery.
 */
const resolveBrevoSender = async (cfg) => {
  if (cfg.brevoSender) {
    return cfg.brevoSender;
  }

  const now = Date.now();
  if (
    cachedBrevoSender &&
    cachedBrevoSender.apiKey === cfg.brevoKey &&
    cachedBrevoSender.expiresAt > now
  ) {
    return cachedBrevoSender.email;
  }

  try {
    const res = await fetch(BREVO_SENDERS_URL, {
      headers: { accept: "application/json", "api-key": cfg.brevoKey },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const activeSenders = (data?.senders || []).filter((s) => s.active && s.email);
      const preferred =
        activeSenders.find((s) => !s.email.toLowerCase().endsWith("@gmail.com")) ||
        activeSenders[0];

      if (preferred?.email) {
        const resolved = preferred.email.trim();
        cachedBrevoSender = {
          apiKey: cfg.brevoKey,
          email: resolved,
          expiresAt: now + 30 * 60 * 1000,
        };
        return resolved;
      }
    }
  } catch (err) {
    console.warn("[email] Could not query Brevo /v3/senders:", err.message);
  }

  return (process.env.ADMIN_EMAIL || DEFAULT_BREVO_SENDER).trim();
};

const sendViaBrevo = async (cfg, { to, subject, text, html }) => {
  const senderEmail = await resolveBrevoSender(cfg);
  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": cfg.brevoKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: cfg.siteName || "NexaMart", email: senderEmail },
      to: [{ email: to.trim() }],
      subject,
      textContent: text || stripHtml(html),
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(BREVO_TIMEOUT_MS),
  });

  if (!res.ok) {
    cachedBrevoSender = null;
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo rejected email (${res.status}): ${detail}`);
  }

  const data = await res.json().catch(() => ({}));
  console.log(`[email] Delivered via Brevo API to ${to} (from: ${senderEmail}, id: ${data?.messageId || "ok"})`);
};

export const createTransport = async (existingCfg = null) => {
  const cfg = existingCfg || (await getEmailConfig());
  if (!cfg.host || !cfg.user || !cfg.pass) {
    throw new Error("SMTP is not configured in .env or Settings.");
  }

  const isGmail =
    cfg.host === "smtp.gmail.com" ||
    (cfg.user && cfg.user.toLowerCase().endsWith("@gmail.com"));

  if (isGmail) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: cfg.user, pass: cfg.pass },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: 15000,
    });
  }

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: 15000,
  });
};

export const sendMail = async ({ to, subject, text, html }) => {
  const cfg = await getEmailConfig();
  const isCloudHosted = Boolean(
    process.env.RENDER ||
      process.env.RENDER_SERVICE_ID ||
      process.env.HEROKU ||
      process.env.DYNO ||
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.FLY_APP_NAME ||
      process.env.VERCEL
  );

  // Cloud free tiers (including Render) block outbound SMTP ports 465/587, so try
  // Brevo's HTTPS API first there instead of waiting 10s+ on a dead SMTP socket.
  const channels = isCloudHosted ? ["brevo", "smtp"] : ["smtp", "brevo"];
  const errors = [];

  for (const channel of channels) {
    if (channel === "brevo" && cfg.brevoKey) {
      try {
        await sendViaBrevo(cfg, { to, subject, text, html });
        return;
      } catch (err) {
        console.error(`[email] Brevo API failed for ${to}:`, err.message);
        errors.push(`Brevo (${err.message})`);
      }
    }

    if (channel === "smtp" && cfg.host && cfg.user && cfg.pass) {
      try {
        const transport = await createTransport(cfg);
        const info = await transport.sendMail({
          from: cfg.from || `${cfg.siteName || "NexaMart"} <${cfg.user}>`,
          to: to.trim(),
          subject,
          text: text || stripHtml(html),
          html,
        });
        console.log(`[email] Delivered via SMTP to ${to} (${info.messageId})`);
        return;
      } catch (err) {
        console.error(`[email] SMTP failed for ${to}:`, err.message);
        errors.push(`SMTP (${err.message})`);
      }
    }
  }

  throw new Error(
    errors.length > 0
      ? `Email delivery failed: ${errors.join("; ")}`
      : "No valid email transport configured (set BREVO_API_KEY or SMTP settings)."
  );
};

export const sendOtpEmail = async ({ to, name, otp, purpose = "verify" }) => {
  const cfg = await getEmailConfig();
  const isReset = purpose === "reset";
  const template = isReset ? cfg.templates.resetPassword : cfg.templates.otp;
  const subject = `${cfg.siteName} \u2014 ${isReset ? "Password reset code" : "Verify your email"}`;
  const html = renderTemplate(template, { name: name || "there", otp, expiry: cfg.otpExpiryMin });
  const text = isReset
    ? `Hi ${name || "there"}, use this code to reset your ${cfg.siteName} password: ${otp}. It expires in ${cfg.otpExpiryMin} minutes.`
    : `Hi ${name || "there"}, your ${cfg.siteName} verification code is: ${otp}. It expires in ${cfg.otpExpiryMin} minutes.`;
  await sendMail({ to, subject, text, html });
};

export const sendOtpEmailInBackground = (options) => {
  sendOtpEmail(options).catch((err) =>
    console.error(`[email] Failed to send ${options.purpose || "verify"} OTP to ${options.to}:`, err.message)
  );
};

export const sendOrderConfirmationEmail = async ({ to, name, orderId, total }) => {
  const cfg = await getEmailConfig();
  const html = renderTemplate(cfg.templates.orderConfirmation, {
    name: name || "there",
    orderId,
    total,
    totalAmount: total,
  });
  await sendMail({
    to,
    subject: `${cfg.siteName} \u2014 Order confirmed`,
    text: `Hi ${name || "there"}, your ${cfg.siteName} order #${orderId} (Total: INR ${total}) is confirmed.`,
    html,
  });
};
