// Branded HTML email templates. Used as the defaults for
// Settings.emailTemplates and rendered with {{name}}, {{otp}}, {{expiry}},
// {{orderId}}, {{total}} placeholders (see utils/email.js -> renderTemplate).
//
// Written the way transactional email has to be written, not the way a web
// page is: a full document, table layout, styles inlined on every element,
// and no reliance on anything Outlook's Word renderer cannot do. The <style>
// block only carries the mobile overrides, which the clients that matter
// (Gmail, Apple Mail, iOS) honour and the ones that do not simply ignore.

const SUPPORT_EMAIL = "zaidm1323@gmail.com";
const BRAND = "NexaMart";
const AUTHOR = "Mohd Zaid";
const ADDRESS = "Tower B, Tech Park, Andheri East, Mumbai, Maharashtra 400093, India";

// Hardcoded rather than read from CLIENT_URL: these templates get snapshotted
// into the Settings document, so whatever value was in the environment at the
// moment they were generated is frozen into the database. A localhost URL
// baked into a production email is a mistake you only notice from a customer.
const SITE_URL = "https://nexa-mart-psi.vercel.app";

const INK = "#1f2933";
const MUTED = "#5b6670";
const FAINT = "#98a1ac";
const BLUE = "#2874f0";
const BLUE_DARK = "#1a4fa8";
const PAPER = "#f1f3f6";
const LINE = "#e6eaf0";

// Wrap body content in the branded shell.
//   preheader - the grey preview line mail clients show next to the subject.
//               Without one they pull the first words of the body, which reads
//               like a mistake.
//   reason    - the "why did I get this" line every legitimate bulk sender
//               carries in the footer.
const shell = (bodyHtml, { preheader = "", reason = "" } = {}) =>
  `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${BRAND}</title>
<style type="text/css">
  body { margin:0 !important; padding:0 !important; width:100% !important; }
  table { border-collapse:collapse; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .wrap { width:100% !important; }
    .pad { padding-left:22px !important; padding-right:22px !important; }
    .h1 { font-size:20px !important; }
    .code { font-size:27px !important; letter-spacing:7px !important; text-indent:7px !important; padding:16px 20px !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${PAPER};">

<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${PAPER};">${preheader}</div>
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;color:${PAPER};">&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
  <tr>
    <td align="center" style="padding:32px 12px;">

      <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border:1px solid ${LINE};border-radius:14px;overflow:hidden;">

        <tr>
          <td class="pad" style="background:${BLUE};padding:22px 36px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;font-style:italic;line-height:1;color:#ffffff;">Nexa<span style="color:#ffe11b;">Mart</span></td>
                <td style="padding-left:9px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background:#ffe11b;border-radius:3px;padding:4px 7px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;line-height:1;color:${BLUE_DARK};letter-spacing:1px;">PLUS</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="pad" style="padding:36px 36px 30px;font-family:Arial,Helvetica,sans-serif;color:${INK};">
${bodyHtml}
          </td>
        </tr>

        <tr>
          <td class="pad" style="background:#fafbfc;border-top:1px solid ${LINE};padding:24px 36px;font-family:Arial,Helvetica,sans-serif;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:bold;color:${INK};">${BRAND} &mdash; Electronics Marketplace</p>
            <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${MUTED};">
              Questions? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:${BLUE};">${SUPPORT_EMAIL}</a>
              &nbsp;&middot;&nbsp; <a href="${SITE_URL}" style="color:${BLUE};">Visit ${BRAND}</a>
            </p>
            <p style="margin:0 0 12px;font-size:11px;line-height:1.6;color:${FAINT};">${ADDRESS}</p>
            ${reason ? `<p style="margin:0 0 10px;font-size:11px;line-height:1.6;color:${FAINT};">${reason}</p>` : ""}
            <p style="margin:0;font-size:11px;color:${FAINT};">&copy; 2026 ${BRAND} &middot; Built by ${AUTHOR}</p>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>`;

// The greeting + headline that opens every message.
const opening = (headline, intro) =>
  `            <p style="margin:0 0 4px;font-size:15px;line-height:1.5;color:${MUTED};">Hi {{name}},</p>
            <h1 class="h1" style="margin:0 0 14px;font-size:23px;line-height:1.3;font-weight:bold;color:${INK};">${headline}</h1>
            <p style="margin:0 0 26px;font-size:15px;line-height:1.65;color:${MUTED};">${intro}</p>`;

// The code block. A monospace face is deliberate: in a proportional font a
// one, an I and an l are the same three pixels, and people mistype the code.
// text-indent cancels the trailing letter-space so the digits sit centred.
const codeBlock = `            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:0 0 18px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="code" style="background:#eef4fe;border:1px solid #cfe0fd;border-radius:10px;padding:20px 32px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:bold;line-height:1;color:${BLUE_DARK};letter-spacing:11px;text-indent:11px;">{{otp}}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 26px;text-align:center;font-size:13px;line-height:1.6;color:${MUTED};">This code expires in <strong style="color:${INK};">{{expiry}} minutes</strong>.</p>`;

// The line that keeps a code email from being a useful phishing template.
const securityNote = `            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#fff8ec;border-left:3px solid #ff9f00;border-radius:0 6px 6px 0;padding:13px 16px;font-size:13px;line-height:1.6;color:${MUTED};">
                  <strong style="color:${INK};">Keep this code to yourself.</strong> ${BRAND} staff will never call, message or email you asking for it.
                </td>
              </tr>
            </table>`;

// A button that survives Outlook, which ignores padding on anchors and needs
// the VML rectangle instead.
const button = (label, href) =>
  `            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:4px 0 26px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:230px;" arcsize="14%" stroke="f" fillcolor="#fb641b">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">${label}</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-- -->
                  <a href="${href}" style="display:inline-block;background:#fb641b;border-radius:6px;padding:14px 34px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;">${label}</a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>`;

export const EMAIL_TEMPLATES = {
  otp: shell(
    `${opening(
      "Confirm your email address",
      `Welcome to ${BRAND}. Enter the code below to verify this address and activate your account.`
    )}
${codeBlock}
${securityNote}
            <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${FAINT};">Didn&rsquo;t sign up for ${BRAND}? You can ignore this email &mdash; no account will be activated without this code.</p>`,
    {
      preheader: "Your {{expiry}}-minute verification code is inside.",
      reason: `You received this email because this address was used to sign up at ${BRAND}.`,
    }
  ),

  resetPassword: shell(
    `${opening(
      "Reset your password",
      `We received a request to reset the password on your ${BRAND} account. Enter this code on the reset page to choose a new one.`
    )}
${codeBlock}
${securityNote}
            <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:${FAINT};">Didn&rsquo;t ask for this? You can ignore this email &mdash; your password has not changed and stays exactly as it was.</p>`,
    {
      preheader: "Your {{expiry}}-minute password reset code is inside.",
      reason: `You received this email because a password reset was requested for this address at ${BRAND}.`,
    }
  ),

  orderConfirmation: shell(
    `${opening(
      "Your order is confirmed",
      `Thanks for shopping with ${BRAND}. We&rsquo;ve received your order and it is being prepared for dispatch.`
    )}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;">
              <tr>
                <td style="background:#fafbfc;border:1px solid ${LINE};border-radius:10px;padding:20px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="stack" width="50%" style="padding:0 0 14px;font-size:12px;line-height:1.5;color:${FAINT};text-transform:uppercase;letter-spacing:0.5px;">Order number</td>
                      <td class="stack" width="50%" style="padding:0 0 14px;font-size:12px;line-height:1.5;color:${FAINT};text-transform:uppercase;letter-spacing:0.5px;">Order total</td>
                    </tr>
                    <tr>
                      <td class="stack" width="50%" style="font-size:16px;font-weight:bold;line-height:1.4;color:${INK};">#{{orderId}}</td>
                      <td class="stack" width="50%" style="font-size:22px;font-weight:bold;line-height:1.2;color:${BLUE};">{{total}}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
${button("Track your order", `${SITE_URL}/orders`)}
            <p style="margin:0;font-size:13px;line-height:1.6;color:${FAINT};">You can follow every step of the delivery from <strong style="color:${MUTED};">My Orders</strong> in your account. We&rsquo;ll email you again the moment it ships.</p>`,
    {
      preheader: "Order #{{orderId}} is confirmed and being prepared for dispatch.",
      reason: `You received this email because an order was placed on this account at ${BRAND}.`,
    }
  ),
};

export default EMAIL_TEMPLATES;
