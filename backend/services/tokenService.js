// JWT and refresh token utilities

import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
};

export const generateRefreshToken = (userId) => {
  const secret = crypto.randomBytes(32).toString("hex");
  return `${userId}.${secret}`;
};

export const parseRefreshToken = (token) => {
  const dot = token.indexOf(".");
  if (dot === -1) {
    return { userId: null, secret: token };
  }
  return { userId: token.slice(0, dot), secret: token.slice(dot + 1) };
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const getRefreshCookieOptions = () => {
  const crossSite = process.env.COOKIE_SECURE === "true";

  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  };
};

export const REFRESH_COOKIE = "refreshToken";
