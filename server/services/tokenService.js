import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "15m" });

export const generateRefreshToken = (userId) =>
  `${userId}.${crypto.randomBytes(32).toString("hex")}`;

export const parseRefreshToken = (token) => {
  const dot = token.indexOf(".");
  return dot === -1
    ? { userId: null, secret: token }
    : { userId: token.slice(0, dot), secret: token.slice(dot + 1) };
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getRefreshCookieOptions = () => {
  const secure = process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  };
};

export const REFRESH_COOKIE = "refreshToken";
