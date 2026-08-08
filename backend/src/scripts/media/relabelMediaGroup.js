// Correct a photo set that is filed under the wrong colour.
//
// Some seeded folders were labelled from the product's declared default colour
// rather than from what the photograph actually shows. The "Beats Black" folder
// holds yellow earphones; the Galaxy S10 "Prism White" folder holds a black
// phone. Left alone, those variants show a photo of the wrong colour — the
// exact bug this system exists to prevent, just inherited from the seed data.
//
// This renames the folder, retags the manifest entries and rewrites the URLs.
//
//   node src/scripts/media/relabelMediaGroup.js <slug> <old-folder> "Color=Yuzu Yellow"
//   node src/scripts/media/relabelMediaGroup.js <slug> <old-folder> "Color=Yuzu Yellow" --write

import fs from "fs";
import path from "path";

import { parseSignature, slugifySignature } from "../../utils/variantMedia.js";
import { PUBLIC_IMAGES, exists } from "./mediaPaths.js";
import { readManifest, writeManifest } from "./manifest.js";

const run = () => {
  const [slug, oldFolder, signature] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const write = process.argv.includes("--write");

  if (!slug || !oldFolder || !signature) {
    console.error('Usage: relabelMediaGroup.js <slug> <old-folder> "Color=New Value" [--write]');
    process.exit(1);
  }

  const attributes = parseSignature(signature);
  const newFolder = slugifySignature(signature);

  const from = path.join(PUBLIC_IMAGES, slug, oldFolder);
  const to = path.join(PUBLIC_IMAGES, slug, newFolder);

  // The rename happens before the manifest is written, so an interrupted run
  // leaves the folder moved and the manifest stale. Detect that and finish the
  // job rather than refusing.
  const alreadyRenamed = !exists(from) && exists(to);

  if (!exists(from) && !alreadyRenamed) {
    console.error(`Not found: ${from}`);
    process.exit(1);
  }
  if (exists(to) && oldFolder !== newFolder && !alreadyRenamed) {
    console.error(`Target already exists: ${to} — remove it first.`);
    process.exit(1);
  }
  if (alreadyRenamed) {
    console.log("(folder is already renamed — updating the manifest only)");
  }

  const manifest = readManifest();
  const entries = (manifest[slug] || []).filter((e) => e.folder === oldFolder);

  console.log(`${slug}: ${oldFolder} -> ${newFolder}`);
  console.log(`  ${JSON.stringify(entries[0]?.attributes || {})}  ->  ${JSON.stringify(attributes)}`);
  console.log(`  ${entries.length} manifest entr${entries.length === 1 ? "y" : "ies"}`);

  if (!write) {
    console.log("\nDRY RUN — pass --write to apply.");
    return;
  }

  if (oldFolder !== newFolder && !alreadyRenamed) {
    fs.renameSync(from, to);
  }

  const swapPath = (value) =>
    typeof value === "string"
      ? value.split(`/${slug}/${oldFolder}/`).join(`/${slug}/${newFolder}/`)
      : value;

  for (const entry of entries) {
    entry.folder = newFolder;
    entry.attributes = attributes;
    entry.url = swapPath(entry.url);
    entry.srcset = swapPath(entry.srcset);
    entry.srcsetAvif = swapPath(entry.srcsetAvif);
  }

  writeManifest(manifest);
  console.log("\nManifest updated. Run migrateProductMedia.js --write to apply to the site.");
};

run();
