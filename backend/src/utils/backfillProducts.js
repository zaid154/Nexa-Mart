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

    if (product.isDeleted == null) {
      product.isDeleted = false;
      changed = true;
    }

    if (!product.status) {
      product.status = product.countInStock > 0 ? "active" : "out_of_stock";
      changed = true;
    }

    if (!product.sku) {
      product.sku = await generateSku({
        category: product.category,
        brand: product.brand,
        name: product.name,
      });
      changed = true;
    }

    product.isActive = product.status === "active";

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
