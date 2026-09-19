// Express application factory and middleware configuration.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
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
import couponRoutes from "./routes/couponRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import pageRoutes, { adminPageRouter } from "./routes/pageRoutes.js";

// Whitelisted origins allowed to access the API via CORS
const allowedOrigins = [
  ...String(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  "http://localhost:5173",
  "https://nexa-mart-psi.vercel.app",
  "https://nexa-mart.onrender.com",
];

export const createApp = () => {
  const app = express();

  // Trust first reverse proxy hop for rate limiting client IP extraction
  app.set("trust proxy", 1);

  // Gzip compression for API responses
  app.use(compression());

  // Security headers configuration
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          imgSrc: ["'none'"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
        },
      },
      xContentTypeOptions: true,
      hidePoweredBy: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // CORS middleware configuration
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    })
  );

  // Cookie parser
  app.use(cookieParser());

  // Parse JSON and URL-encoded bodies; preserve raw buffer for webhook signature verification
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Sanitize user-supplied input to prevent MongoDB operator injection
  app.use(mongoSanitize());

  // Global rate limiting configuration
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
  const max = Number(process.env.RATE_LIMIT_MAX) || 200;

  app.use(
    rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: "Too many requests, please try again later" },
    })
  );

  // Stricter rate limiting for authentication endpoints
  app.use(
    "/api/auth",
    rateLimit({
      windowMs,
      max: 30,
      message: { success: false, message: "Too many auth attempts" },
    })
  );

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API route mounts
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/payment", paymentRoutes);
  app.use("/api/coupons", couponRoutes);
  app.use("/api/pages", pageRoutes);
  app.use("/api/admin/settings", settingsRoutes);
  app.use("/api/admin/pages", adminPageRouter);
  app.use("/api/admin", adminRoutes);

  // Redirect root and web requests to frontend application (API requests continue under /api)
  const frontendUrl =
    String(process.env.CLIENT_URL || "").split(",")[0].trim() ||
    "https://nexa-mart-psi.vercel.app";

  app.use((req, res, next) => {
    const isApi = req.path === "/api" || req.path.startsWith("/api/");
    if (req.method === "GET" && !isApi) {
      res.redirect(302, frontendUrl + req.originalUrl);
      return;
    }
    next();
  });

  // Error handling middleware
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
