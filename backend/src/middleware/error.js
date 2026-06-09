// This file has two middlewares:
// 1) notFound  - runs when no route matched the request.
// 2) errorHandler - turns errors into a clean JSON response.

import { logError } from "../utils/logger.js";

// If the URL did not match any route, create a 404 error.
export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
};

// Central error handler. Express calls this whenever a handler throws.
export const errorHandler = async (err, req, res, next) => {
  // Decide the status code. If it is still 200, treat it as a 500 error.
  let statusCode = 500;
  if (res.statusCode && res.statusCode !== 200) {
    statusCode = res.statusCode;
  }

  // Decide the message to show.
  let message = err.message || "Server Error";

  // A bad MongoDB id usually means the resource was not found.
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  }

  // Error code 11000 means a duplicate value (a unique field was repeated).
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  }

  // A Mongoose validation error: join all the field messages together.
  if (err.name === "ValidationError") {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(", ");
  }

  // Problems with the JWT token.
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // A file upload error from multer.
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File too large";
    } else {
      message = err.message;
    }
  }

  // Payment errors use status 402 (Payment Required).
  if (err.type === "payment") {
    statusCode = 402;
  }

  // Save serious errors (server errors and auth errors) to the activity log.
  if (statusCode >= 500 || statusCode === 401) {
    await logError(err, req);
  }

  // In production we hide the stack trace; in development we show it.
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
