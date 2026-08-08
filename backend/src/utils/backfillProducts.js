// A one-off script that fills in missing fields on older products
// (isDeleted, status, sku) so they match the current schema.
// Run it with:  node src/utils/backfillProducts.js

import "../config/env.js";
import { connectDB, disconnectDB } from "../config/db.js";
import Product from "../models/Product.js";
import { generateSku } from "./sku.js";

const run = async () => {
  await connectDB();

  const products = await Product.find({});
  let updated = 0;

  for (const product of products) {
    let changed = false;

    // Make sure isDeleted has a value.
    if (product.isDeleted == null) {
      product.isDeleted = false;
      changed = true;
    }

    // Give the product a status based on its stock if it has none.
    if (!product.status) {
      if (product.countInStock > 0) {
        product.status = "active";
      } else {
        product.status = "out_of_stock";
      }
      changed = true;
    }

    // Generate a SKU if the product does not have one.
    if (!product.sku) {
      product.sku = await generateSku({
        category: product.category,
        brand: product.brand,
        name: product.name,
      });
      changed = true;
    }

    // Keep isActive in sync with the status.
    product.isActive = product.status === "active";

    // Only save if something actually changed.
    if (changed) {
      await product.save();
      updated++;
    }
  }

  console.log(`Backfill complete: ${updated} of ${products.length} product(s) updated.`);
  await disconnectDB();
};

run().catch((err) => {
  console.error("Backfill failed:", err.message);
  process.exit(1);
});
