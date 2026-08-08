// Turn one source photo into the responsive files the storefront serves.
//
// Every photo is trimmed of its uniform border, padded onto a square white
// canvas (the product page renders inside an aspect-square box, so squaring the
// source here means nothing letterboxes unevenly later), then written as WebP
// and AVIF at each width. Widths larger than the source are skipped rather than
// upscaled, so a small photo simply gets fewer entries in its srcset.

import fs from "fs";
import path from "path";
import sharp from "sharp";

import { WIDTHS, DEFAULT_WIDTH } from "./mediaPaths.js";

// Size ceilings per width. A file over budget means the encoder settings need
// looking at, not that we should quietly ship a heavy page.
const BUDGET_BYTES = { 400: 40 * 1024, 800: 120 * 1024, 1600: 320 * 1024 };

export const processImage = async (sourcePath, outputDir, index, options = {}) => {
  const { force = false, background = "#ffffff" } = options;

  fs.mkdirSync(outputDir, { recursive: true });

  // Trim the flat border first so products fill the frame consistently, then
  // measure what is left. Some photos are already tight, so trim can throw or
  // return nothing useful; fall back to the untrimmed buffer in that case.
  let base = sharp(sourcePath).rotate();
  let trimmed;
  try {
    trimmed = await base.trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
  } catch {
    trimmed = null;
  }

  const working = trimmed ? sharp(trimmed.data) : sharp(sourcePath).rotate();
  const meta = await working.metadata();
  const sourceWidth = meta.width || 0;
  const sourceHeight = meta.height || 0;

  if (!sourceWidth || !sourceHeight) {
    throw new Error(`Could not read dimensions for ${sourcePath}`);
  }

  // Never upscale. Always emit at least the smallest width so every photo has
  // a usable file even when the source is tiny.
  const longest = Math.max(sourceWidth, sourceHeight);
  let widths = WIDTHS.filter((w) => w <= longest);
  if (widths.length === 0) {
    widths = [WIDTHS[0]];
  }

  // If the source is meaningfully bigger than the largest tier we picked, keep
  // its native size as a final tier. The catalogue's photos are 1000px, which
  // would otherwise be thrown away down to 800 and look soft on a high-density
  // phone screen.
  const largest = widths[widths.length - 1];
  if (longest > largest * 1.15) {
    widths = [...widths, longest];
  }

  const written = [];
  const overBudget = [];

  for (const width of widths) {
    const square = () =>
      sharp(trimmed ? trimmed.data : sourcePath)
        .rotate()
        .resize(width, width, { fit: "contain", background });

    for (const format of ["webp", "avif"]) {
      const file = path.join(outputDir, `${index}-${width}.${format}`);

      if (!force && fs.existsSync(file)) {
        written.push(file);
        continue;
      }

      const pipeline =
        format === "webp"
          ? square().webp({ quality: 78, effort: 5 })
          : square().avif({ quality: 50, effort: 4 });

      await pipeline.toFile(file);
      written.push(file);

      const size = fs.statSync(file).size;
      // Native-size tiers are not in the table; hold them to the nearest budget.
      const budget = BUDGET_BYTES[width] || BUDGET_BYTES[width > 1200 ? 1600 : 800];
      // AVIF should always come in under the WebP budget; if it does not, the
      // source is probably noisy and worth a look.
      if (budget && size > budget) {
        overBudget.push({ file, size, budget });
      }
    }
  }

  const srcsetFor = (format) => widths.map((w) => `${index}-${w}.${format} ${w}w`).join(", ");

  return {
    index,
    widths,
    written,
    overBudget,
    // Relative pieces; the caller prefixes the public path.
    src: `${index}-${Math.min(DEFAULT_WIDTH, widths[widths.length - 1])}.webp`,
    srcsetTemplate: srcsetFor("webp"),
    srcsetAvifTemplate: srcsetFor("avif"),
    width: Math.min(DEFAULT_WIDTH, widths[widths.length - 1]),
    height: Math.min(DEFAULT_WIDTH, widths[widths.length - 1]),
  };
};
