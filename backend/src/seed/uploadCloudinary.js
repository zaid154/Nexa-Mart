import "../config/env.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { connectDB, disconnectDB } from "../config/db.js";
import Product from "../models/Product.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../../");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER_NAME = process.env.CLOUDINARY_FOLDER || "Nexa Mart";
const BASE_IMAGES_DIR = path.join(ROOT_DIR, "frontend/public/images/products");

const run = async () => {
  console.log(`[Cloudinary] Connecting to account: ${process.env.CLOUDINARY_CLOUD_NAME}...`);
  const ping = await cloudinary.api.ping();
  console.log(`[Cloudinary] Connected successfully: ${ping.status}`);

  console.log("[MongoDB] Connecting to database...");
  await connectDB();

  const productDirs = fs
    .readdirSync(BASE_IMAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  console.log(`[Upload] Found ${productDirs.length} products to upload into "${FOLDER_NAME}/products"...`);

  const results = {};
  let totalUploaded = 0;

  for (let i = 0; i < productDirs.length; i++) {
    const slug = productDirs[i];
    const dirPath = path.join(BASE_IMAGES_DIR, slug);
    results[slug] = [];

    process.stdout.write(`\n(${i + 1}/${productDirs.length}) Uploading ${slug}... `);

    for (let idx = 1; idx <= 3; idx++) {
      const filePath = path.join(dirPath, `${idx}.webp`);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const uploadRes = await cloudinary.uploader.upload(filePath, {
          folder: `${FOLDER_NAME}/products/${slug}`,
          public_id: `${idx}`,
          resource_type: "image",
          overwrite: true,
        });

        results[slug].push({
          url: uploadRes.secure_url,
          publicId: uploadRes.public_id,
          attributes: {},
        });
        totalUploaded++;
        process.stdout.write(`[#${idx} OK] `);
      } catch (err) {
        process.stdout.write(`[#${idx} FAIL: ${err.message}] `);
      }
    }

    // Update product document in MongoDB Atlas
    if (results[slug].length > 0) {
      const updated = await Product.findOneAndUpdate(
        { slug },
        { images: results[slug] },
        { new: true }
      );
      if (updated) {
        process.stdout.write(`-> DB updated (${updated.images.length} images)`);
      } else {
        process.stdout.write(`-> (Slug not found in DB, skipped DB update)`);
      }
    }
  }

  // Save JS map file for catalogue seed
  const mapJsPath = path.join(__dirname, "cloudinaryMap.js");
  fs.writeFileSync(
    mapJsPath,
    `// Auto-generated Cloudinary asset mapping\nexport default ${JSON.stringify(results, null, 2)};\n`
  );
  console.log(`\n\n[Mapping] Saved Cloudinary mapping to: ${mapJsPath}`);

  // Update catalogue.js to use Cloudinary mapping
  const cataloguePath = path.join(__dirname, "catalogue.js");
  let catalogueContent = fs.readFileSync(cataloguePath, "utf-8");

  const newImgsFunction = `import cloudinaryMap from "./cloudinaryMap.js";

// Helper to resolve product photos from Cloudinary with local fallback
const imgs = (slug) => {
  if (cloudinaryMap[slug] && cloudinaryMap[slug].length > 0) {
    return cloudinaryMap[slug];
  }
  return [
    { url: \`/images/products/\${slug}/1.webp\`, attributes: {} },
    { url: \`/images/products/\${slug}/2.webp\`, attributes: {} },
    { url: \`/images/products/\${slug}/3.webp\`, attributes: {} },
  ];
};`;

  catalogueContent = catalogueContent.replace(
    /\/\/ Helper to resolve local product photos[\s\S]*?const imgs = \(slug\) => {[\s\S]*?};/,
    newImgsFunction
  );

  fs.writeFileSync(cataloguePath, catalogueContent);
  console.log("[Catalogue] Updated backend/src/seed/catalogue.js to use Cloudinary mapping.");

  await disconnectDB();
  console.log(`\n🎉 [Finished] Successfully uploaded ${totalUploaded} images to Cloudinary and synchronized MongoDB Atlas!\n`);
};

run().catch(async (err) => {
  console.error("\nUpload failed:", err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
