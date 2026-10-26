import express from "express";
import { getSettings, getPublicSettings, getInvoiceSettings, updateSettings, sendTestEmail } from "../controllers/settingsController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public", getPublicSettings);
router.get("/invoice", getInvoiceSettings);
router.get("/", protect, admin, getSettings);
router.put("/", protect, admin, updateSettings);
router.post("/test-email", protect, admin, sendTestEmail);

export default router;
