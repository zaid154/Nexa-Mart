// Move the photos already on disk into the per-variant layout and generate
// their responsive derivatives.
//
//   frontend/public/images/products/iphone-13-pro/1.webp
//     -> frontend/public/images/products/iphone-13-pro/color-sierra-blue/1-400.webp
//                                                                       1-800.webp
//                                                                       1-1600.webp
//                                                                       1-{...}.avif
//
// Which group a product's flat files belong to comes from its first variant:
// the catalogue's first variant is the default and matches the product's base
// price, so the existing photography is of that configuration. A product whose
// variants differ only by storage or size has no visual grouping and its photos
// become the generic `_base` set.
//
//   node src/scripts/media/optimizeExistingMedia.js            # dry run
//   node src/scripts/media/optimizeExistingMedia.js --write
//   node src/scripts/media/optimizeExistingMedia.js --write --clean

import fs from "fs";
import path from "path";

import { catalogue, variantsByProduct } from "../../utils/catalogue.js";
import { signatureOf, slugifySignature, parseSignature } from "../../utils/variantMedia.js";
import { PUBLIC_IMAGES, STAGING, listFiles, slugFromImages, exists } from "./mediaPaths.js";
import { processImage } from "./processImage.js";
import { writeManifest, readManifest } from "./manifest.js";

const SOURCE_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

const run = async () => {
  const write = process.argv.includes("--write");
  const clean = process.argv.includes("--clean");
  const force = process.argv.includes("--force");

  if (!write) {
    console.log("DRY RUN — pass --write to actually generate files.\n");
  }

  const manifest = readManifest();
  let processed = 0;
  let skipped = 0;
  const warnings = [];

  for (const product of catalogue) {
    const slug = slugFromImages(product.images);
    if (!slug) {
      warnings.push(`${product.name}: could not work out a folder slug`);
      continue;
    }

    const root = path.join(PUBLIC_IMAGES, slug);
    if (!exists(root)) {
      warnings.push(`${product.name}: ${slug}/ does not exist`);
      continue;
    }

    const flat = listFiles(root, SOURCE_EXTENSIONS);
    if (flat.length === 0) {
      skipped += 1;
      continue;
    }

    const variants = variantsByProduct[product.name] || [];
    const signature =
      variants.length > 0 ? signatureOf(variants[0].attributes) : signatureOf(product.attributes);
    const folder = slugifySignature(signature);
    const attributes = parseSignature(signature);
    const outputDir = path.join(root, folder);

    console.log(`${product.name}`);
    console.log(`  ${slug}/  ->  ${slug}/${folder}/   [${signature}]  ${flat.length} photo(s)`);

    const entries = [];

    // Keep the catalogue's original ordering (1.webp, 2.webp, ...).
    const ordered = flat
      .map((name) => ({ name, n: parseInt(path.basename(name, path.extname(name)), 10) }))
      .sort((a, b) => (Number.isNaN(a.n) ? 0 : a.n) - (Number.isNaN(b.n) ? 0 : b.n));

    for (let i = 0; i < ordered.length; i++) {
      const index = i + 1;
      const source = path.join(root, ordered[i].name);

      if (!write) {
        entries.push({ index, folder, attributes });
        continue;
      }

      const result = await processImage(source, outputDir, index, { force });

      for (const over of result.overBudget) {
        warnings.push(
          `${product.name}: ${path.basename(over.file)} is ${Math.round(over.size / 1024)} KB ` +
            `(budget ${Math.round(over.budget / 1024)} KB)`
        );
      }

      const publicBase = `/images/products/${slug}/${folder}`;
      entries.push({
        index,
        folder,
        attributes,
        url: `${publicBase}/${result.src}`,
        width: result.width,
        height: result.height,
        srcset: prefix(result.srcsetTemplate, publicBase),
        srcsetAvif: prefix(result.srcsetAvifTemplate, publicBase),
      });

      processed += 1;
    }

    manifest[slug] = mergeGroup(manifest[slug], folder, entries);

    // Archiving the flat sources is deliberately NOT done here. Removing files
    // this script reads from means a re-run would rebuild the product's group
    // from whatever survived, quietly shrinking it. Use archiveFlatOriginals.js
    // once the manifest looks right.
  }

  if (write) {
    writeManifest(manifest);
    console.log(`\nGenerated derivatives for ${processed} photo(s).`);
    console.log("Wrote backend/src/utils/generated/productMedia.json");
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} product(s) with no flat files (already restructured).`);
  }

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const warning of warnings) {
      console.log(`  ${warning}`);
    }
  }
};

// Turn "1-400.webp 400w, ..." into "/images/products/<slug>/<folder>/1-400.webp 400w, ...".
const prefix = (template, base) =>
  template
    .split(", ")
    .map((entry) => `${base}/${entry}`)
    .join(", ");

// Replace just this folder's entries, leaving any other groups intact.
const mergeGroup = (existing, folder, entries) => {
  const kept = (existing || []).filter((item) => item.folder !== folder);
  return [...kept, ...entries];
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
