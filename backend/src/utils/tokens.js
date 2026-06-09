// Helper functions for creating and checking access/refresh tokens,
// plus the cookie options used to store the refresh token.

import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Create a short-lived access token (JWT) that holds the user id.
export const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
};

// Create a refresh token in the form "userId.randomSecret".
export const generateRefreshToken = (userId) => {
  const secret = crypto.randomBytes(32).toString("hex");
  return `${userId}.${secret}`;
};

// Split a refresh token back into its userId and secret parts.
export const parseRefreshToken = (token) => {
  const dot = token.indexOf(".");

  // If there is no dot, there is no user id part.
  if (dot === -1) {
    return { userId: null, secret: token };
  }

  const userId = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  return { userId, secret };
};

// Hash a token before saving it in the database.
export const hashToken = async (token) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(token, salt);
};

// Check whether a token matches a saved hash.
export const verifyRefreshToken = async (token, hash) => {
  return bcrypt.compare(token, hash);
};

// The cookie settings used when we send the refresh token to the browser.
export const getRefreshCookieOptions = () => {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  };
};

// The name of the refresh-token cookie.
export const REFRESH_COOKIE = "refreshToken";
