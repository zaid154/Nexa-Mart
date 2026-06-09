import express from "express";
import { getSettings, getPublicSettings, updateSettings, sendTestEmail } from "../controllers/settingsController.js";
import { protect, admin } from "../middleware/auth.js";

const router = express.Router();

router.get("/public", getPublicSettings);

router.use(protect, admin);
router.get("/", getSettings);
router.put("/", updateSettings);
router.post("/test-email", sendTestEmail);

export default router;
