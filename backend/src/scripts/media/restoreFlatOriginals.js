// Put the flat product photos back where the site serves them from.
//
// The reverse of archiveFlatOriginals.js. A database that has not been migrated
// yet still points at /images/products/<slug>/1.webp, so archiving those files
// makes every product image 404. Run this to get them back immediately, without
// touching the database.
//
//   node src/scripts/media/restoreFlatOriginals.js            # dry run
//   node src/scripts/media/restoreFlatOriginals.js --write

import fs from "fs";
import path from "path";

import { PUBLIC_IMAGES, STAGING, listDirs, listFiles, exists } from "./mediaPaths.js";

const SOURCE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

const copyWithRetry = (from, to, attempts = 5) => {
  for (let i = 0; i < attempts; i++) {
    try {
      fs.copyFileSync(from, to);
      return true;
    } catch (err) {
      if (err.code !== "EBUSY" && err.code !== "EPERM") {
        throw err;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
    }
  }
  return false;
};

const run = () => {
  const write = process.argv.includes("--write");
  if (!write) {
    console.log("DRY RUN — pass --write to restore the files.\n");
  }

  const attic = path.join(STAGING, "_originals");
  if (!exists(attic)) {
    console.log("Nothing archived — media-staging/_originals/ does not exist.");
    return;
  }

  let restored = 0;
  const failed = [];

  for (const slug of listDirs(attic)) {
    const from = path.join(attic, slug);
    const to = path.join(PUBLIC_IMAGES, slug);
    const files = listFiles(from, SOURCE_EXTENSIONS);
    if (files.length === 0) {
      continue;
    }

    if (write) {
      fs.mkdirSync(to, { recursive: true });
    }

    for (const name of files) {
      if (!write) {
        continue;
      }
      // Copy rather than move, so the archive stays intact and this can be run
      // again safely.
      if (copyWithRetry(path.join(from, name), path.join(to, name))) {
        restored += 1;
      } else {
        failed.push(`${slug}/${name}`);
      }
    }

    console.log(`${write ? "RESTORED" : "WOULD RESTORE"}  ${slug}  ${files.length} file(s)`);
  }

  console.log(`\n${write ? `Restored ${restored}` : "Would restore"} file(s) to frontend/public/images/products/.`);
  if (failed.length > 0) {
    console.log(`${failed.length} file(s) were locked — re-run to pick them up:`);
    for (const item of failed) {
      console.log(`  ${item}`);
    }
  }
};

run();
