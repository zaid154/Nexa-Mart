// Shared paths and small helpers for the media scripts.

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

// backend/src/scripts/media -> repo root
export const REPO_ROOT = path.resolve(here, "..", "..", "..", "..");
export const PUBLIC_IMAGES = path.join(REPO_ROOT, "frontend", "public", "images", "products");
export const STAGING = path.join(REPO_ROOT, "media-staging");
export const GENERATED_MANIFEST = path.join(
  REPO_ROOT,
  "backend",
  "src",
  "utils",
  "generated",
  "productMedia.js"
);

// The widths we generate. Sizes larger than the source are skipped rather than
// upscaled, so a small source photo simply gets fewer entries.
export const WIDTHS = [400, 800, 1600];

// The width whose file is used as the plain `src` fallback.
export const DEFAULT_WIDTH = 800;

export const exists = (p) => fs.existsSync(p);

export const listDirs = (dir) => {
  if (!exists(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

export const listFiles = (dir, extensions) => {
  if (!exists(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !extensions || extensions.includes(path.extname(name).toLowerCase()))
    .sort();
};

// The slug a product's photos live under. The catalogue declares it inside the
// image paths, so we read it back from the first path.
export const slugFromImages = (images) => {
  const first = images && images[0];
  const value = typeof first === "string" ? first : first?.url;
  if (!value) {
    return null;
  }
  const match = String(value).match(/\/images\/products\/([^/]+)\//);
  return match ? match[1] : null;
};
