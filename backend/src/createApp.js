// This file creates and configures the Express application.
// It sets up security, CORS, body parsing, rate limiting and all the routes.

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

// The list of website addresses that are allowed to call this API.
// We use filter(Boolean) to drop any empty values (like a missing CLIENT_URL).
const allowedOrigins = [
  // CLIENT_URL may contain more than one deployed frontend, separated by commas.
  ...String(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  "http://localhost:5173",
  "https://nexamart-28c93.web.app",
  "https://nexamart-28c93.firebaseapp.com",
  "https://nexa-mart-psi.vercel.app",
  "https://nexa-mart.onrender.com",
];

export const createApp = () => {
  const app = express();

  // On Render our app sits behind one reverse proxy, so the visitor's real
  // IP arrives in the X-Forwarded-For header. Trusting exactly one hop lets
  // the rate limiter count each visitor separately instead of counting
  // everyone as the proxy. We use 1 and not `true`, because `true` would let
  // a visitor fake the header and get around the rate limit.
  app.set("trust proxy", 1);

  // Gzip every response. Product listings are the biggest payloads the API
  // sends and they are almost entirely repeated JSON keys, so this is the
  // cheapest win available.
  app.use(compression());

  // Helmet adds safe HTTP headers to protect the app. Since this server
  // only serves JSON (/api/*), the CSP is locked down to prevent any
  // accidental HTML rendering from executing scripts.
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
      // Prevent MIME-type sniffing
      // Already included by default, but being explicit
      xContentTypeOptions: true,
      // Disable X-Powered-By header (hides Express)
      hidePoweredBy: true,
      // Strict referrer policy
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

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
  // We also keep the raw body around so the Razorpay webhook can verify
  // its signature against the exact bytes that were sent.
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    })
  );
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
  app.use("/api/coupons", couponRoutes);
  app.use("/api/pages", pageRoutes);
  app.use("/api/admin/settings", settingsRoutes);
  app.use("/api/admin/pages", adminPageRouter);
  app.use("/api/admin", adminRoutes);

  // This server only serves /api/*. The website itself lives on Vercel.
  // Render shows its own URL after every deploy, so people do open it and
  // land here. Instead of a confusing JSON 404, send them to the real site
  // and keep the path, so /products lands on the frontend's /products page.
  // Anything under /api/ is left alone and still gives a proper JSON 404.
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

  // If no route matched, send a 404. Then handle any errors.
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
