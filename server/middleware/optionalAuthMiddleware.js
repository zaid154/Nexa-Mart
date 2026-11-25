// Optional JWT authentication middleware; attaches user if token is present without blocking guest requests.

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

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
    // Ignore invalid or expired token for guest mode
  }

  next();
});
