// This middleware tries to load the user if a token is present,
// but it does NOT block the request when there is no token.
// It is used for routes that work for both guests and logged-in users.

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // No token? Just continue as a guest.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, isDeleted: { $ne: true } }).select("-password");
    if (user) {
      req.user = user;
    }
  } catch {
    // If the token is invalid we ignore it and continue as a guest.
  }

  next();
});
