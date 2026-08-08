// This middleware protects routes that require a logged-in user.
// It reads the JWT token, checks it, and loads the user.

import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/User.js";

// "protect" makes sure the request has a valid login token.
export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // The token must be sent like:  Authorization: Bearer <token>
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  // Get just the token part after "Bearer ".
  const token = authHeader.split(" ")[1];

  try {
    // Verify the token and get the user id from it.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user (and skip deleted users). Do not include the password.
    const user = await User.findOne({ _id: decoded.id, isDeleted: { $ne: true } }).select("-password");

    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    // Suspended users are not allowed in.
    if (user.status === "suspended") {
      res.status(403);
      throw new Error("Account suspended");
    }

    // Save the user on the request so other handlers can use it.
    req.user = user;
    next();
  } catch (err) {
    // A token that expired gets a clearer message.
    if (err.name === "TokenExpiredError") {
      res.status(401);
      throw new Error("Token expired");
    }
    res.status(401);
    throw new Error("Not authorized, token failed");
  }
});

// "admin" makes sure the logged-in user is an admin.
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403);
    throw new Error("Not authorized as admin");
  }
};
