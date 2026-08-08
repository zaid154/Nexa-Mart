// Move the old flat product photos out of the folder the site serves.
//
// Once optimizeExistingMedia.js has built the per-variant derivatives, files
// like products/iphone-13-pro/1.webp are no longer referenced by anything —
// but they still get uploaded on every deploy. This moves them to
// media-staging/_originals/, which is ignored by both git and Vercel, so they
// stop shipping without being thrown away: they are the only full-quality
// sources we have.
//
// It refuses to move anything that the manifest does not already have
// derivatives for, so it can never leave a product with no photos.
//
// It also refuses to run at all while the database still points at the flat
// paths. Archiving first and migrating second is the wrong order and takes
// every product image on the site down — run migrateProductMedia.js first.
// Pass --skip-db-check only when there is no database to check against.
//
//   node src/scripts/media/archiveFlatOriginals.js            # dry run
//   node src/scripts/media/archiveFlatOriginals.js --write

import "../../config/env.js";
import fs from "fs";
import path from "path";

import { PUBLIC_IMAGES, STAGING, listDirs, listFiles, exists } from "./mediaPaths.js";
import { readManifest } from "./manifest.js";

const SOURCE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

// Windows file locks (indexer, antivirus, an open preview) show up as EBUSY and
// clear on their own within a moment.
const moveWithRetry = (from, to, attempts = 5) => {
  for (let i = 0; i < attempts; i++) {
    try {
      fs.renameSync(from, to);
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

// Is the database still serving the flat paths these files sit at? If so,
// moving them makes every product image on the site 404.
const databaseStillUsesFlatPaths = async () => {
  const [{ default: mongoose }, { connectDB }, { default: Product }] = await Promise.all([
    import("mongoose"),
    import("../../config/db.js"),
    import("../../models/Product.js"),
  ]);

  await connectDB();
  try {
    const products = await Product.find({ isDeleted: { $ne: true } })
      .select("images.url")
      .lean();

    // A flat path is /images/products/<slug>/<n>.webp — no photo-set folder.
    const flat = /^\/images\/products\/[^/]+\/[^/]+\.(webp|jpe?g|png)$/i;

    for (const product of products) {
      for (const image of product.images || []) {
        if (image.url && flat.test(image.url)) {
          return image.url;
        }
      }
    }
    return null;
  } finally {
    await mongoose.disconnect();
  }
};

const run = async () => {
  const write = process.argv.includes("--write");
  if (!write) {
    console.log("DRY RUN — pass --write to move the files.\n");
  }

  if (write && !process.argv.includes("--skip-db-check")) {
    let stale = null;
    try {
      stale = await databaseStillUsesFlatPaths();
    } catch (err) {
      console.error(`Could not check the database: ${err.message}`);
      console.error("Re-run with --skip-db-check if there is no database to check.");
      process.exit(1);
    }

    if (stale) {
      console.error("REFUSING TO RUN — the database still points at the old flat paths.");
      console.error(`  for example: ${stale}`);
      console.error("");
      console.error("Moving these files now would make every product image 404.");
      console.error("Run this first:  node src/scripts/media/migrateProductMedia.js --write");
      process.exit(1);
    }
  }

  const manifest = readManifest();

  let moved = 0;
  let skipped = 0;
  const locked = [];

  for (const slug of listDirs(PUBLIC_IMAGES)) {
    const root = path.join(PUBLIC_IMAGES, slug);
    const flat = listFiles(root, SOURCE_EXTENSIONS);
    if (flat.length === 0) {
      continue;
    }

    // Only archive once the derivatives are genuinely on disk.
    const entries = manifest[slug] || [];
    const derivativesPresent =
      entries.length > 0 &&
      entries.every((entry) => exists(path.join(PUBLIC_IMAGES, "..", "..", entry.url.slice(1))));

    if (!derivativesPresent) {
      console.log(`SKIP  ${slug} — no derivatives in the manifest yet`);
      skipped += 1;
      continue;
    }

    const attic = path.join(STAGING, "_originals", slug);
    if (write) {
      fs.mkdirSync(attic, { recursive: true });
    }

    for (const name of flat) {
      if (!write) {
        continue;
      }
      const ok = moveWithRetry(path.join(root, name), path.join(attic, name));
      if (ok) {
        moved += 1;
      } else {
        locked.push(`${slug}/${name}`);
      }
    }

    console.log(`${write ? "MOVED" : "WOULD MOVE"}  ${slug}  ${flat.length} file(s)`);
  }

  console.log(`\n${write ? "Moved" : "Would move"} ${moved || "?"} file(s) to media-staging/_originals/.`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} product(s) that have no derivatives yet.`);
  }
  if (locked.length > 0) {
    console.log(`\n${locked.length} file(s) were locked and left in place — re-run to pick them up:`);
    for (const item of locked) {
      console.log(`  ${item}`);
    }
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
