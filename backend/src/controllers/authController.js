// This controller handles everything about user accounts:
// register, verify email, login, logout, password reset and profile.

import asyncHandler from "express-async-handler";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { sendOtpEmail } from "../utils/email.js";
import { generateOtpCode, getOtpExpiryMin } from "../utils/otp.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
  REFRESH_COOKIE,
} from "../utils/tokens.js";
import { logActivity } from "../utils/logger.js";

// Return only the safe user fields (never the password) to send to the client.
const sanitizeUser = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    status: user.status,
    address: user.address,
    addresses: user.addresses,
  };
};

// Check that a password is strong enough.
// Returns an error message string, or null if the password is fine.
const strongPassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include a number";
  }
  return null;
};

// Create a login session: make tokens, save the refresh token, set the cookie.
const issueSession = async (user, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id.toString());

  // Save the refresh token (hashed) so we can verify it later.
  const tokenHash = await hashToken(refreshToken);
  user.refreshTokens.push({
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Only keep the last 5 refresh tokens per user.
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }

  await user.save();

  // Send the refresh token to the browser as an httpOnly cookie.
  res.cookie(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());

  return accessToken;
};

// POST /api/auth/register  - create a new account and send a verify OTP.
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // All three fields are required.
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  // Make sure the password is strong enough.
  const pwdErr = strongPassword(password);
  if (pwdErr) {
    res.status(400);
    throw new Error(pwdErr);
  }

  // Do not allow two accounts with the same email.
  const exists = await User.findOne({ email, isDeleted: { $ne: true } });
  if (exists) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  // Create the user as not-yet-verified.
  const user = await User.create({ name, email, password, isVerified: false });

  // Make and email a verification OTP.
  const code = generateOtpCode();
  const expiryMin = await getOtpExpiryMin();
  await Otp.createOtp(email, code, "verify", expiryMin);
  await sendOtpEmail({ to: email, name, otp: code, purpose: "verify" });

  await logActivity({
    type: "auth",
    actor: user._id,
    action: "register",
    meta: { email },
    ip: req.ip,
  });

  res.status(201).json({
    message: "Account created. Please verify your email with the OTP sent.",
    email,
    requiresVerification: true,
  });
});

// POST /api/auth/verify-otp  - verify the email using the OTP code.
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    res.status(400);
    throw new Error("Email and OTP code are required");
  }

  // Find the verify OTP for this email.
  const otp = await Otp.findOne({ email: email.toLowerCase(), purpose: "verify" });
  if (!otp) {
    res.status(400);
    throw new Error("OTP not found or expired. Request a new one.");
  }

  // Check the typed code. If it failed, choose a clear message.
  const result = await otp.verifyCode(code);
  if (!result.ok) {
    let message;
    if (result.reason === "expired") {
      message = "OTP has expired";
    } else if (result.reason === "max_attempts") {
      message = "Too many attempts. Request a new OTP.";
    } else {
      message = "Invalid OTP";
    }
    res.status(400);
    throw new Error(message);
  }

  // Find the user and mark them as verified.
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.isVerified = true;
  await otp.deleteOne();
  const token = await issueSession(user, res);

  await logActivity({
    type: "auth",
    actor: user._id,
    action: "email_verified",
    ip: req.ip,
  });

  res.json({ user: sanitizeUser(user), token, message: "Email verified successfully" });
});

// POST /api/auth/resend-otp  - send a fresh OTP code.
export const resendOtp = asyncHandler(async (req, res) => {
  const { email, purpose = "verify" } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // No need to verify again if the email is already verified.
  if (purpose === "verify" && user.isVerified) {
    res.status(400);
    throw new Error("Email is already verified");
  }

  // Decide the purpose to use for the email.
  let emailPurpose;
  if (purpose === "reset") {
    emailPurpose = "reset";
  } else {
    emailPurpose = "verify";
  }

  const code = generateOtpCode();
  const expiryMin = await getOtpExpiryMin();
  await Otp.createOtp(email, code, purpose, expiryMin);
  await sendOtpEmail({
    to: email,
    name: user.name,
    otp: code,
    purpose: emailPurpose,
  });

  res.json({ message: "OTP sent to your email" });
});

// POST /api/auth/login  - log a user in.
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find the user and include the password field for checking.
  const user = await User.findOne({ email, isDeleted: { $ne: true } }).select("+password");

  // If there is no user, or the password is wrong, log it and reject.
  if (!user || !(await user.matchPassword(password))) {
    await logActivity({
      type: "security",
      action: "login_failed",
      meta: { email },
      ip: req.ip,
    });
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // The email must be verified first.
  if (!user.isVerified) {
    res.status(403);
    throw new Error("Please verify your email before logging in");
  }

  // Suspended accounts cannot log in.
  if (user.status === "suspended") {
    res.status(403);
    throw new Error("Your account has been suspended. Contact support.");
  }

  const token = await issueSession(user, res);

  await logActivity({
    type: "login",
    actor: user._id,
    action: "login_success",
    ip: req.ip,
  });

  res.json({ user: sanitizeUser(user), token });
});

// POST /api/auth/forgot-password  - send a reset code if the email exists.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  // Only send a code if the user exists, but do not reveal that to the caller.
  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
  if (user) {
    const code = generateOtpCode();
    const expiryMin = await getOtpExpiryMin();
    await Otp.createOtp(email, code, "reset", expiryMin);
    await sendOtpEmail({ to: email, name: user.name, otp: code, purpose: "reset" });
  }

  // Always send the same response to prevent email enumeration.
  res.json({ message: "If that email exists, a reset code has been sent" });
});

// POST /api/auth/reset-password  - set a new password using a reset code.
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;

  if (!email || !code || !password) {
    res.status(400);
    throw new Error("Email, code and new password are required");
  }

  // The new password must still be strong.
  const pwdErr = strongPassword(password);
  if (pwdErr) {
    res.status(400);
    throw new Error(pwdErr);
  }

  // Find the reset OTP.
  const otp = await Otp.findOne({ email: email.toLowerCase(), purpose: "reset" });
  if (!otp) {
    res.status(400);
    throw new Error("Reset code not found or expired");
  }

  // Check the code.
  const result = await otp.verifyCode(code);
  if (!result.ok) {
    let message;
    if (result.reason === "expired") {
      message = "Code has expired";
    } else {
      message = "Invalid code";
    }
    res.status(400);
    throw new Error(message);
  }

  // Find the user and set the new password.
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = password;
  // Clear all refresh tokens so old sessions are logged out.
  user.refreshTokens = [];
  await otp.deleteOne();
  await user.save();

  await logActivity({
    type: "auth",
    actor: user._id,
    action: "password_reset",
    ip: req.ip,
  });

  res.json({ message: "Password reset successfully. You can now log in." });
});

// POST /api/auth/refresh  - get a new access token using the refresh cookie.
export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401);
    throw new Error("No refresh token");
  }

  // The refresh token starts with the user id, so we can find the user quickly.
  const { userId } = (await import("../utils/tokens.js")).parseRefreshToken(token);
  let user = null;
  if (userId) {
    user = await User.findById(userId);
  }
  if (!user) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  // Look for a saved refresh token that is not expired and matches.
  let matchedIndex = -1;
  for (let i = 0; i < user.refreshTokens.length; i++) {
    const rt = user.refreshTokens[i];
    if (rt.expiresAt < new Date()) {
      continue;
    }
    if (await verifyRefreshToken(token, rt.tokenHash)) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  // Remove the used token and issue a fresh session (token rotation).
  user.refreshTokens.splice(matchedIndex, 1);
  const accessToken = await issueSession(user, res);
  res.json({ token: accessToken });
});

// POST /api/auth/logout  - log the user out and clear the refresh token.
export const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];

  if (token && req.user) {
    const user = await User.findById(req.user._id);
    if (user) {
      // Keep every refresh token EXCEPT the one being logged out (and drop expired ones).
      const valid = [];
      for (const rt of user.refreshTokens) {
        if (rt.expiresAt < new Date()) {
          continue;
        }
        if (await verifyRefreshToken(token, rt.tokenHash)) {
          continue;
        }
        valid.push(rt);
      }
      user.refreshTokens = valid;
      await user.save();
    }
  }

  res.clearCookie(REFRESH_COOKIE, getRefreshCookieOptions());
  res.json({ message: "Logged out" });
});

// GET /api/auth/profile  - return the logged-in user's profile.
export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// PUT /api/auth/profile  - update the logged-in user's profile.
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, password, address, addresses } = req.body;

  if (name) {
    user.name = name;
  }

  // If a new password is given, check it is strong before setting it.
  if (password) {
    const pwdErr = strongPassword(password);
    if (pwdErr) {
      res.status(400);
      throw new Error(pwdErr);
    }
    user.password = password;
  }

  if (address) {
    user.address = address;
  }
  if (addresses) {
    user.addresses = addresses;
  }

  const updated = await user.save();
  res.json({ user: sanitizeUser(updated) });
});
