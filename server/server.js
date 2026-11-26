import "./config/envConfig.js";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

import { connectDB } from "./config/dbConfig.js";
import { validateEnv } from "./config/validateEnvConfig.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

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

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

const app = express();

app.set("trust proxy", 1);
app.use(compression());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
    xContentTypeOptions: true,
    hidePoweredBy: true,
  })
);

const allowedOrigins = [
  ...String(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  "http://localhost:5173",
  "https://nexamart-pro.vercel.app",
  "https://nexa-mart.onrender.com",
];

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

app.use(cookieParser());
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// Rate limiters
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

app.use(
  "/api/auth",
  rateLimit({
    windowMs,
    max: 30,
    message: { success: false, message: "Too many auth attempts" },
  })
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Routes
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

// Redirect web root requests to frontend application
const frontendUrl =
  String(process.env.CLIENT_URL || "").split(",")[0].trim() ||
  "https://nexamart-pro.vercel.app/";

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

// Start server
const start = async () => {
  try {
    validateEnv();
    await connectDB();
    app.listen(PORT, HOST, () => {
      console.log(`NexaMart server running at http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  console.error("[SERVER] Unhandled Rejection:", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("[SERVER] Uncaught Exception:", err?.message || err);
});

start();
