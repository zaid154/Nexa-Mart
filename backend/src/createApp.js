// This file creates and configures the Express application.
// It sets up security, CORS, body parsing, rate limiting and all the routes.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

import { notFound, errorHandler } from "./middleware/error.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

// The list of website addresses that are allowed to call this API.
// We use filter(Boolean) to drop any empty values (like a missing CLIENT_URL).
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "https://nexamart-28c93.web.app",
  "https://nexamart-28c93.firebaseapp.com",
  "https://nexa-mart.onrender.com",
].filter(Boolean);

export const createApp = () => {
  const app = express();

  // Helmet adds some safe HTTP headers to protect the app.
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // CORS decides which websites are allowed to talk to our API.
  app.use(
    cors({
      origin(origin, callback) {
        // Requests with no origin (like Postman or server-to-server) are allowed.
        if (!origin) {
          callback(null, true);
          return;
        }

        // Allow our known origins, plus any Firebase hosting subdomain.
        if (
          allowedOrigins.includes(origin) ||
          origin.endsWith(".web.app") ||
          origin.endsWith(".firebaseapp.com")
        ) {
          callback(null, true);
          return;
        }

        // Otherwise, do not allow this origin.
        callback(null, false);
      },
      credentials: true,
    })
  );

  // Read cookies from incoming requests.
  app.use(cookieParser());

  // Read JSON and form data from the request body (max size 10mb).
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Remove any dangerous MongoDB operators from user input.
  app.use(mongoSanitize());

  // Rate limiting settings (how many requests are allowed in a time window).
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
  const max = Number(process.env.RATE_LIMIT_MAX) || 200;

  // General rate limit for the whole API.
  app.use(
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: "Too many requests, please try again later" },
    })
  );

  // A stricter rate limit just for the auth routes (login, register, etc.).
  app.use(
    "/api/auth",
    rateLimit({
      windowMs,
      max: 30,
      message: { success: false, message: "Too many auth attempts" },
    })
  );

  // A simple health-check route to test if the server is alive.
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Connect each group of routes to its base path.
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payment", paymentRoutes);
  app.use("/api/admin/settings", settingsRoutes);
  app.use("/api/admin", adminRoutes);

  // If no route matched, send a 404. Then handle any errors.
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
