// Read and write the generated media manifest.
//
// The manifest is the bridge between the media scripts and the catalogue: the
// scripts own what is on disk, and catalogue.js reads this file rather than
// anyone hand-typing image paths, widths and srcsets.

import fs from "fs";
import path from "path";

import { REPO_ROOT } from "./mediaPaths.js";

// Written as a JS module rather than JSON so catalogue.js can import it with a
// plain `import` on every Node version.
export const MANIFEST_PATH = path.join(
  REPO_ROOT,
  "backend",
  "src",
  "utils",
  "generated",
  "productMedia.js"
);

const HEADER = `// GENERATED FILE — do not edit by hand.
//
// Written by backend/src/scripts/media/*. It records every product photo on
// disk: which variant it depicts, its responsive sources and its size.
// Regenerate with:
//
//   node src/scripts/media/optimizeExistingMedia.js --write
//   node src/scripts/media/promoteMedia.js --write

const productMedia = `;

export const readManifest = () => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return {};
  }
  try {
    const source = fs.readFileSync(MANIFEST_PATH, "utf8");
    const start = source.indexOf("{");
    const end = source.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return {};
    }
    return JSON.parse(source.slice(start, end + 1));
  } catch {
    return {};
  }
};

export const writeManifest = (manifest) => {
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });

  // Sort so the file diffs cleanly between runs.
  const sorted = {};
  for (const slug of Object.keys(manifest).sort()) {
    sorted[slug] = [...manifest[slug]].sort(
      (a, b) => a.folder.localeCompare(b.folder) || a.index - b.index
    );
  }

  const body = `${HEADER}${JSON.stringify(sorted, null, 2)};\n\nexport default productMedia;\n`;
  fs.writeFileSync(MANIFEST_PATH, body);
};
