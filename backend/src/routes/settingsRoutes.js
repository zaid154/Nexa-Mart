// These are the routes for everything under /api/admin/settings.

import express from "express";
import { getSettings, getPublicSettings, updateSettings, sendTestEmail } from "../controllers/settingsController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

// Public settings (site name, support email, social links) - no login needed.
router.get("/public", getPublicSettings);

// Everything below here needs a logged-in admin.
router.use(protect, admin);
router.get("/", getSettings);
router.put("/", updateSettings);
router.post("/test-email", sendTestEmail);

export default router;
