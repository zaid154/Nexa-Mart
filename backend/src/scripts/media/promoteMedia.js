// Move approved candidates into the storefront and drop the variants that had
// no acceptable photo.
//
// Reads media-staging/approvals.json (written by the review sheet), runs each
// approved file through the same sharp pipeline the existing photos went
// through, and updates the generated manifest. Variants marked "drop" are
// listed at the end for removal from catalogue.js — the script prints the exact
// lines rather than editing the catalogue behind your back.
//
//   node src/scripts/media/promoteMedia.js            # dry run
//   node src/scripts/media/promoteMedia.js --write

import fs from "fs";
import path from "path";

import { catalogue, variantsByProduct } from "../../utils/catalogue.js";
import { parseSignature, signatureOf, slugifySignature } from "../../utils/variantMedia.js";
import { PUBLIC_IMAGES, STAGING, exists } from "./mediaPaths.js";
import { processImage } from "./processImage.js";
import { readManifest, writeManifest } from "./manifest.js";

const run = async () => {
  const write = process.argv.includes("--write");
  const force = process.argv.includes("--force");

  const approvalsPath = path.join(STAGING, "approvals.json");
  if (!exists(approvalsPath)) {
    console.error(`No ${approvalsPath}.`);
    console.error("Run buildReviewSheet.js, approve in the browser, and save approvals.json there.");
    process.exit(1);
  }

  const approvals = JSON.parse(fs.readFileSync(approvalsPath, "utf8"));
  const manifest = readManifest();

  if (!write) {
    console.log("DRY RUN — pass --write to generate files and update the manifest.\n");
  }

  const dropped = [];
  const warnings = [];
  let promoted = 0;

  for (const [slug, folders] of Object.entries(approvals)) {
    for (const [folder, decision] of Object.entries(folders)) {
      if (decision.drop) {
        dropped.push({ slug, folder });
        continue;
      }

      const files = decision.approve || [];
      if (files.length === 0) {
        continue;
      }

      const sourceDir = path.join(STAGING, slug, folder);
      const outputDir = path.join(PUBLIC_IMAGES, slug, folder);
      const attributes = attributesFor(slug, folder);

      if (!attributes) {
        warnings.push(`${slug}/${folder}: no variant asks for this photo set — skipped`);
        continue;
      }

      console.log(`${slug}/${folder}  ${files.length} photo(s)  ${JSON.stringify(attributes)}`);

      const entries = [];

      for (let i = 0; i < files.length; i++) {
        const index = i + 1;
        const source = path.join(sourceDir, files[i]);

        if (!exists(source)) {
          warnings.push(`${slug}/${folder}: ${files[i]} is not in the staging folder`);
          continue;
        }

        if (!write) {
          entries.push({ index, folder, attributes });
          continue;
        }

        const result = await processImage(source, outputDir, index, { force });

        for (const over of result.overBudget) {
          warnings.push(
            `${slug}/${folder}: ${path.basename(over.file)} is ${Math.round(over.size / 1024)} KB ` +
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
        promoted += 1;
      }

      manifest[slug] = [...(manifest[slug] || []).filter((e) => e.folder !== folder), ...entries];
    }
  }

  if (write) {
    writeManifest(manifest);
    console.log(`\nPromoted ${promoted} photo(s). Manifest updated.`);
  }

  if (dropped.length > 0) {
    console.log(`\n${dropped.length} variant(s) had no acceptable photo and must be removed`);
    console.log("from variantsByProduct in backend/src/utils/catalogue.js:\n");
    for (const item of dropped) {
      const match = findVariantRow(item.slug, item.folder);
      if (match) {
        console.log(`  ${match.product}`);
        console.log(`    remove: [${JSON.stringify(match.attributes)}, ...]`);
      } else {
        console.log(`  ${item.slug}/${item.folder}`);
      }
    }
    console.log("\nShowing a variant with no photo of its own is exactly the bug we are fixing,");
    console.log("so these options must go rather than fall back to another colour's photos.");
  }

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const warning of warnings) {
      console.log(`  ${warning}`);
    }
  }

  console.log("\nNext: node src/scripts/media/auditVariantMedia.js --strict");
};

const prefix = (template, base) =>
  template
    .split(", ")
    .map((entry) => `${base}/${entry}`)
    .join(", ");

// Which variant attributes does this folder represent? Taken from the variants
// themselves so a typo'd folder name cannot invent a photo set nobody asked for.
const attributesFor = (slug, folder) => {
  for (const product of catalogue) {
    const productSlug = product.images?.[0]?.url?.match(/\/images\/products\/([^/]+)\//)?.[1];
    if (productSlug !== slug) {
      continue;
    }

    for (const variant of variantsByProduct[product.name] || []) {
      const signature = signatureOf(variant.attributes);
      if (slugifySignature(signature) === folder) {
        return parseSignature(signature);
      }
    }
  }

  return null;
};

const findVariantRow = (slug, folder) => {
  for (const product of catalogue) {
    const productSlug = product.images?.[0]?.url?.match(/\/images\/products\/([^/]+)\//)?.[1];
    if (productSlug !== slug) {
      continue;
    }
    for (const variant of variantsByProduct[product.name] || []) {
      if (slugifySignature(signatureOf(variant.attributes)) === folder) {
        return { product: product.name, attributes: variant.attributes };
      }
    }
  }
  return null;
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
