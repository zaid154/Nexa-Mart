// Apply the per-variant image layout to an existing database.
//
// seedDatabase() is not an option here: it deletes users, orders and coupons
// before it rebuilds the catalogue. This script only touches product images,
// matching each product by SKU (falling back to name) and replacing its image
// list with the tagged, responsive one from the generated manifest.
//
//   node src/scripts/media/migrateProductMedia.js            # dry run
//   node src/scripts/media/migrateProductMedia.js --write

import "../../config/env.js";
import mongoose from "mongoose";

import Product from "../../models/Product.js";
import { catalogue } from "../../utils/catalogue.js";
import { connectDB } from "../../config/db.js";

const run = async () => {
  const write = process.argv.includes("--write");

  if (!write) {
    console.log("DRY RUN — pass --write to update the database.\n");
  }

  await connectDB();

  let updated = 0;
  let missing = 0;
  let unchanged = 0;

  for (const entry of catalogue) {
    if (!entry.images?.length) {
      console.log(`SKIP  ${entry.name} — no images in the manifest`);
      continue;
    }

    const product = await Product.findOne({ name: entry.name });
    if (!product) {
      console.log(`MISS  ${entry.name} — not in the database`);
      missing += 1;
      continue;
    }

    // Keep any image an admin uploaded (those carry a Buffer or a Cloudinary
    // publicId); only the seeded local files are replaced.
    const uploaded = (product.images || []).filter((img) => img.data || img.publicId);

    const before = JSON.stringify(
      (product.images || []).map((img) => [img.url, Object.fromEntries(img.attributes || [])])
    );

    product.images = [...entry.images, ...uploaded];

    const after = JSON.stringify(
      product.images.map((img) => [img.url, img.attributes || {}])
    );

    if (before === after) {
      unchanged += 1;
      continue;
    }

    console.log(
      `${write ? "UPDATE" : "WOULD"}  ${entry.name}  ${entry.images.length} tagged photo(s)` +
        (uploaded.length ? ` (+${uploaded.length} admin upload(s) kept)` : "")
    );

    if (write) {
      await product.save();
    }
    updated += 1;
  }

  console.log(`\n${write ? "Updated" : "Would update"} ${updated} product(s).`);
  if (unchanged > 0) {
    console.log(`${unchanged} already up to date.`);
  }
  if (missing > 0) {
    console.log(`${missing} catalogue product(s) are not in this database.`);
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
