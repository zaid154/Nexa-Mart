import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });

export const generateRefreshToken = (userId) =>
  `${userId}.${crypto.randomBytes(32).toString("hex")}`;

export const parseRefreshToken = (token) => {
  const dot = token.indexOf(".");
  if (dot === -1) return { userId: null, secret: token };
  return { userId: token.slice(0, dot), secret: token.slice(dot + 1) };
};

export const hashToken = async (token) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(token, salt);
};

export const verifyRefreshToken = async (token, hash) => bcrypt.compare(token, hash);

export const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
});

export const REFRESH_COOKIE = "refreshToken";
