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

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  status: user.status,
  address: user.address,
  addresses: user.addresses,
});

const strongPassword = (password) => {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must include a number";
  return null;
};

const issueSession = async (user, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id.toString());
  const tokenHash = await hashToken(refreshToken);
  user.refreshTokens.push({
    tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  // keep last 5 refresh tokens
  if (user.refreshTokens.length > 5) {
    user.refreshTokens = user.refreshTokens.slice(-5);
  }
  await user.save();
  res.cookie(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());
  return accessToken;
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  const pwdErr = strongPassword(password);
  if (pwdErr) {
    res.status(400);
    throw new Error(pwdErr);
  }

  const exists = await User.findOne({ email, isDeleted: { $ne: true } });
  if (exists) {
    res.status(400);
    throw new Error("User with this email already exists");
  }

  const user = await User.create({ name, email, password, isVerified: false });

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

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400);
    throw new Error("Email and OTP code are required");
  }

  const otp = await Otp.findOne({ email: email.toLowerCase(), purpose: "verify" });
  if (!otp) {
    res.status(400);
    throw new Error("OTP not found or expired. Request a new one.");
  }

  const result = await otp.verifyCode(code);
  if (!result.ok) {
    res.status(400);
    throw new Error(
      result.reason === "expired"
        ? "OTP has expired"
        : result.reason === "max_attempts"
          ? "Too many attempts. Request a new OTP."
          : "Invalid OTP"
    );
  }

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

  if (purpose === "verify" && user.isVerified) {
    res.status(400);
    throw new Error("Email is already verified");
  }

  const code = generateOtpCode();
  const expiryMin = await getOtpExpiryMin();
  await Otp.createOtp(email, code, purpose, expiryMin);
  await sendOtpEmail({
    to: email,
    name: user.name,
    otp: code,
    purpose: purpose === "reset" ? "reset" : "verify",
  });

  res.json({ message: "OTP sent to your email" });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, isDeleted: { $ne: true } }).select("+password");
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

  if (!user.isVerified) {
    res.status(403);
    throw new Error("Please verify your email before logging in");
  }

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

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
  if (user) {
    const code = generateOtpCode();
    const expiryMin = await getOtpExpiryMin();
    await Otp.createOtp(email, code, "reset", expiryMin);
    await sendOtpEmail({ to: email, name: user.name, otp: code, purpose: "reset" });
  }

  // always same response to prevent email enumeration
  res.json({ message: "If that email exists, a reset code has been sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) {
    res.status(400);
    throw new Error("Email, code and new password are required");
  }

  const pwdErr = strongPassword(password);
  if (pwdErr) {
    res.status(400);
    throw new Error(pwdErr);
  }

  const otp = await Otp.findOne({ email: email.toLowerCase(), purpose: "reset" });
  if (!otp) {
    res.status(400);
    throw new Error("Reset code not found or expired");
  }

  const result = await otp.verifyCode(code);
  if (!result.ok) {
    res.status(400);
    throw new Error(result.reason === "expired" ? "Code has expired" : "Invalid code");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.password = password;
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

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) {
    res.status(401);
    throw new Error("No refresh token");
  }

  const { userId } = (await import("../utils/tokens.js")).parseRefreshToken(token);
  const user = userId ? await User.findById(userId) : null;
  if (!user) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  let matchedIndex = -1;
  for (let i = 0; i < user.refreshTokens.length; i++) {
    const rt = user.refreshTokens[i];
    if (rt.expiresAt < new Date()) continue;
    if (await verifyRefreshToken(token, rt.tokenHash)) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    res.status(401);
    throw new Error("Invalid refresh token");
  }

  user.refreshTokens.splice(matchedIndex, 1);
  const accessToken = await issueSession(user, res);
  res.json({ token: accessToken });
});

export const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token && req.user) {
    const user = await User.findById(req.user._id);
    if (user) {
      const valid = [];
      for (const rt of user.refreshTokens) {
        if (rt.expiresAt < new Date()) continue;
        if (await verifyRefreshToken(token, rt.tokenHash)) continue;
        valid.push(rt);
      }
      user.refreshTokens = valid;
      await user.save();
    }
  }
  res.clearCookie(REFRESH_COOKIE, getRefreshCookieOptions());
  res.json({ message: "Logged out" });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, password, address, addresses } = req.body;
  if (name) user.name = name;
  if (password) {
    const pwdErr = strongPassword(password);
    if (pwdErr) {
      res.status(400);
      throw new Error(pwdErr);
    }
    user.password = password;
  }
  if (address) user.address = address;
  if (addresses) user.addresses = addresses;

  const updated = await user.save();
  res.json({ user: sanitizeUser(updated) });
});
