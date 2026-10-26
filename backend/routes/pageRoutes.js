// Routes for CMS content pages.
//   /api/pages         -> public (footer pages)
//   /api/admin/pages   -> admin editor (login + admin required)

import express from "express";
import { protect, admin } from "../middleware/auth.js";
import {
  listPages,
  getPage,
  adminListPages,
  savePage,
  createPage,
  deletePage,
} from "../controllers/pageController.js";

// ── Public router (mounted at /api/pages) ──────────────────────────
const router = express.Router();
router.get("/", listPages);
router.get("/:slug", getPage);
export default router;

// ── Admin router (mounted at /api/admin/pages) ─────────────────────
export const adminPageRouter = express.Router();
adminPageRouter.use(protect, admin);
adminPageRouter.get("/", adminListPages);
adminPageRouter.post("/", createPage);
adminPageRouter.put("/:slug", savePage);
adminPageRouter.delete("/:slug", deletePage);
