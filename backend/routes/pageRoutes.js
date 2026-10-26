import express from "express";
import { listPages, getPage, adminListPages, savePage, createPage, deletePage } from "../controllers/pageController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public footer pages
router.get("/", listPages);
router.get("/:slug", getPage);

export default router;

// Admin CMS page management
export const adminPageRouter = express.Router();
adminPageRouter.use(protect, admin);
adminPageRouter.get("/", adminListPages);
adminPageRouter.post("/", createPage);
adminPageRouter.put("/:slug", savePage);
adminPageRouter.delete("/:slug", deletePage);
