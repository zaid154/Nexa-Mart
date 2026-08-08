// A one-off script that regenerates placeholder images for products
// that do not already have a real (URL) image.
// Run it with:  node src/utils/regenProductImages.js

import "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import Product from "../models/Product.js";
import { makeImage } from "./seedData.js";

const run = async () => {
  await connectDB();

  // Only regenerate placeholder images (Mongo buffers). Leave Cloudinary URLs untouched.
  const products = await Product.find({ isDeleted: { $ne: true } });
  let updated = 0;

  for (const product of products) {
    // Skip products that already have at least one real image URL.
    const hasRealImage = (product.images || []).some((img) => img.url);
    if (hasRealImage) {
      continue;
    }

    // Replace the images with a freshly generated placeholder.
    product.images = [makeImage(product.name, product.brand || "NexaMart")];
    await product.save();
    updated++;
  }

  console.log(`Regenerated placeholder images for ${updated} product(s).`);
  await disconnectDB();
};

run().catch((err) => {
  console.error("Regen failed:", err.message);
  process.exit(1);
});
