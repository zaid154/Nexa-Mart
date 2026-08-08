// Find byte-identical product photos.
//
// Two colourways sharing an identical file is a real problem: it means a
// recolour produced no change, or the same photo was filed under two variants.
// Either way the shopper sees the same picture for two different options, which
// is the bug this whole system exists to prevent.
//
// Reports by default. --write replaces duplicates outside the first folder with
// nothing (it deletes them) so the audit shows the gap honestly rather than
// hiding it behind a copy.
//
//   node src/scripts/media/dedupeMedia.js
//   node src/scripts/media/dedupeMedia.js --write

import crypto from "crypto";
import fs from "fs";
import path from "path";

import { PUBLIC_IMAGES, listDirs, listFiles } from "./mediaPaths.js";

const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

const run = () => {
  const write = process.argv.includes("--write");

  const byHash = new Map();
  let scanned = 0;

  for (const slug of listDirs(PUBLIC_IMAGES)) {
    for (const folder of listDirs(path.join(PUBLIC_IMAGES, slug))) {
      const dir = path.join(PUBLIC_IMAGES, slug, folder);
      for (const name of listFiles(dir, [".webp", ".avif"])) {
        const file = path.join(dir, name);
        const key = hash(file);
        scanned += 1;

        if (!byHash.has(key)) {
          byHash.set(key, []);
        }
        byHash.get(key).push({ slug, folder, name, file });
      }
    }
  }

  // Only duplicates that span different photo sets matter. The same file
  // appearing twice inside one folder cannot happen (names are unique).
  const groups = [...byHash.values()].filter((items) => {
    if (items.length < 2) {
      return false;
    }
    const sets = new Set(items.map((i) => `${i.slug}/${i.folder}`));
    return sets.size > 1;
  });

  console.log(`Scanned ${scanned} file(s).`);

  if (groups.length === 0) {
    console.log("No photo is shared between two different variants. Nothing to clean up.");
    return;
  }

  console.log(`\n${groups.length} identical file(s) appearing under more than one variant:\n`);

  let wasted = 0;
  for (const items of groups) {
    console.log(`  ${items[0].name}`);
    for (const item of items) {
      console.log(`      ${item.slug}/${item.folder}/`);
    }
    for (const item of items.slice(1)) {
      wasted += fs.statSync(item.file).size;
      if (write) {
        fs.unlinkSync(item.file);
      }
    }
  }

  console.log(`\n${write ? "Removed" : "Would remove"} ${Math.round(wasted / 1024)} KB of duplicates.`);
  console.log(
    "A duplicate across two colourways usually means a recolour produced no visible change —\n" +
      "check that colourway rather than assuming it is fine."
  );
};

run();
