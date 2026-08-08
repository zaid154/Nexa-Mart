// Delete a photo set and its manifest entries.
//
// Used to back out a rendered colourway that did not come out looking like the
// real product. A broken or obviously fake image is worse than no image: the
// gallery has an honest "no photo yet" state, and a variant with nothing is
// visibly incomplete, while a variant with a wrong-looking photo just looks
// like a badly run shop.
//
//   node src/scripts/media/removeMediaGroup.js <slug> <folder>
//   node src/scripts/media/removeMediaGroup.js <slug> <folder> --write

import fs from "fs";
import path from "path";

import { PUBLIC_IMAGES, exists } from "./mediaPaths.js";
import { readManifest, writeManifest } from "./manifest.js";

const run = () => {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const write = process.argv.includes("--write");

  if (args.length < 2) {
    console.error("Usage: removeMediaGroup.js <slug> <folder> [--write]");
    console.error("       removeMediaGroup.js <slug> <folder> <folder> ... [--write]");
    process.exit(1);
  }

  const [slug, ...folders] = args;
  const manifest = readManifest();

  for (const folder of folders) {
    const dir = path.join(PUBLIC_IMAGES, slug, folder);
    const entries = (manifest[slug] || []).filter((e) => e.folder === folder);
    const fileCount = exists(dir) ? fs.readdirSync(dir).length : 0;

    if (!exists(dir) && entries.length === 0) {
      console.log(`SKIP  ${slug}/${folder} — not present`);
      continue;
    }

    console.log(
      `${write ? "REMOVE" : "WOULD REMOVE"}  ${slug}/${folder}  ` +
        `(${fileCount} file(s), ${entries.length} manifest entr${entries.length === 1 ? "y" : "ies"})`
    );

    if (!write) {
      continue;
    }

    if (exists(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (manifest[slug]) {
      manifest[slug] = manifest[slug].filter((e) => e.folder !== folder);
    }
  }

  if (write) {
    writeManifest(manifest);
    console.log("\nManifest updated. Run migrateProductMedia.js --write to apply to the site.");
    console.log("Those variants will show the gallery's honest \"no photo yet\" state.");
  }
};

run();
