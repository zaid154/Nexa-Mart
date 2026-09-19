// Error handling and not found middleware.

import { logError } from "../utils/logger.js";

// Catch 404 for unhandled route paths
export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
};

// Centralized application error handler
export const errorHandler = async (err, req, res, next) => {
  let statusCode = 500;
  if (res.statusCode && res.statusCode !== 200) {
    statusCode = res.statusCode;
  }

  let message = err.message || "Server Error";

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Mongo duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  }

  // Mongoose schema validation error
  if (err.name === "ValidationError") {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(", ");
  }

  // JWT authentication errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Multer upload error
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File too large";
    } else {
      message = err.message;
    }
  }

  // Payment errors
  if (err.type === "payment") {
    statusCode = 402;
  }

  // Log 5xx server errors and 401 unauthorized attempts
  if (statusCode >= 500 || statusCode === 401) {
    await logError(err, req);
  }

  // Omit stack trace in production
  let stack = err.stack;
  if (process.env.NODE_ENV === "production") {
    stack = undefined;
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack,
  });
};
