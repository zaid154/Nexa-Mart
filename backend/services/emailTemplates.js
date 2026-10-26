// Transactional email templates for authentication and orders

const BRAND = "NexaMart";

const layout = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; }
    .header { font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 20px; }
    .otp { font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; background: #f1f5f9; padding: 12px 24px; border-radius: 6px; display: inline-block; margin: 16px 0; font-family: monospace; }
    .footer { font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">${BRAND}</div>
    <h3>${title}</h3>
    ${body}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${BRAND}. This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

export const EMAIL_TEMPLATES = {
  otp: layout(
    "Verify Your Email",
    `<p>Hi {{name}},</p>
     <p>Your verification code for ${BRAND} is:</p>
     <div class="otp">{{otp}}</div>
     <p>This code will expire in {{expiry}} minutes. Please do not share this code with anyone.</p>`
  ),

  resetPassword: layout(
    "Reset Your Password",
    `<p>Hi {{name}},</p>
     <p>We received a request to reset your password. Use the verification code below:</p>
     <div class="otp">{{otp}}</div>
     <p>This code will expire in {{expiry}} minutes. If you did not request this, you can ignore this email.</p>`
  ),

  orderConfirmation: layout(
    "Order Confirmed!",
    `<p>Hi {{name}},</p>
     <p>Thank you for shopping with ${BRAND}! Your order <strong>#{{orderId}}</strong> has been placed successfully.</p>
     <p>Total Amount: <strong>₹{{totalAmount}}</strong></p>
     <p>You can track your order status anytime from your account dashboard.</p>`
  ),
};
