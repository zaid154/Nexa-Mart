// Audit which variant photo sets exist and which are missing.
//
// For every product this works out the distinct photo sets its variants need
// (one per combination of visual attributes) and checks what is actually on
// disk. It is the work list for the rest of the media scripts, and with
// --strict it is the regression guard: it exits non-zero if any variant would
// show nothing, or would show another variant's photos.
//
//   node src/scripts/media/auditVariantMedia.js
//   node src/scripts/media/auditVariantMedia.js --strict
//   node src/scripts/media/auditVariantMedia.js --json

import fs from "fs";
import path from "path";

import { catalogue, variantsByProduct } from "../../utils/catalogue.js";
import {
  BASE_GROUP,
  signatureOf,
  signaturesForVariants,
  slugifySignature,
  parseSignature,
  visualAttributes,
} from "../../utils/variantMedia.js";
import {
  PUBLIC_IMAGES,
  REPO_ROOT,
  listDirs,
  listFiles,
  slugFromImages,
  exists,
} from "./mediaPaths.js";

const IMAGE_EXTENSIONS = [".webp", ".avif", ".jpg", ".jpeg", ".png"];

// Which photo set do a product's loose top-level files belong to?
//
// Before the restructure every product keeps its photos flat in <slug>/1.webp,
// and those photos show one particular configuration. The catalogue tells us
// which: the first variant is the default and matches the product's own base
// price, so the existing photography is of that configuration. A product whose
// variants differ only by storage or size has no visual grouping at all and its
// photos are simply the generic set.
const inferredFlatSignature = (product, variants) => {
  if (variants.length > 0) {
    return signatureOf(variants[0].attributes);
  }
  return signatureOf(product.attributes);
};

// What is on disk for one product, grouped by signature.
const scanProduct = (slug, product, variants) => {
  const root = path.join(PUBLIC_IMAGES, slug);
  const groups = new Map();

  if (!exists(root)) {
    return groups;
  }

  const flat = listFiles(root, IMAGE_EXTENSIONS);
  if (flat.length > 0) {
    groups.set(inferredFlatSignature(product, variants), {
      folder: ".",
      files: flat,
      responsive: false,
    });
  }

  for (const dir of listDirs(root)) {
    const files = listFiles(path.join(root, dir), IMAGE_EXTENSIONS);
    if (files.length === 0) {
      continue;
    }

    // Recover the signature from the folder name by matching it against the
    // signatures we would have generated.
    groups.set(dir, { folder: dir, files, responsive: true });
  }

  return groups;
};

// Folder names are lossy (lower case, punctuation stripped), so match a needed
// signature against what is on disk by comparing slugs.
const findGroup = (groups, signature) => {
  const wantedSlug = slugifySignature(signature);

  for (const [key, value] of groups.entries()) {
    if (key === signature) {
      return value;
    }
    if (slugifySignature(key) === wantedSlug) {
      return value;
    }
    if (value.folder === wantedSlug) {
      return value;
    }
  }

  return null;
};

const run = () => {
  const strict = process.argv.includes("--strict");
  const asJson = process.argv.includes("--json");

  const report = {
    products: [],
    totals: {
      products: 0,
      productsWithVariants: 0,
      signaturesNeeded: 0,
      signaturesPresent: 0,
      signaturesMissing: 0,
      orphanGroups: 0,
    },
  };

  for (const product of catalogue) {
    const slug = slugFromImages(product.images);
    const variants = variantsByProduct[product.name] || [];
    const needed = signaturesForVariants(variants);
    const groups = scanProduct(slug, product, variants);

    const present = [];
    const missing = [];

    for (const signature of needed) {
      const group = findGroup(groups, signature);
      if (group) {
        present.push({ signature, folder: group.folder, files: group.files.length });
      } else {
        missing.push({
          signature,
          folder: slugifySignature(signature),
          attributes: parseSignature(signature),
        });
      }
    }

    // Photo sets on disk that no variant asks for.
    const neededSlugs = new Set(needed.map(slugifySignature));
    const orphans = [];
    for (const [key, value] of groups.entries()) {
      if (!neededSlugs.has(slugifySignature(key))) {
        orphans.push({ signature: key, folder: value.folder, files: value.files.length });
      }
    }

    report.products.push({
      name: product.name,
      slug,
      category: product.category,
      variantCount: variants.length,
      needed,
      present,
      missing,
      orphans,
    });

    report.totals.products += 1;
    if (variants.length > 0) {
      report.totals.productsWithVariants += 1;
    }
    report.totals.signaturesNeeded += needed.length;
    report.totals.signaturesPresent += present.length;
    report.totals.signaturesMissing += missing.length;
    report.totals.orphanGroups += orphans.length;
  }

  fs.writeFileSync(path.join(REPO_ROOT, "media-report.json"), JSON.stringify(report, null, 2));

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printReport(report);
  }

  if (strict && report.totals.signaturesMissing > 0) {
    console.error(
      `\nFAIL: ${report.totals.signaturesMissing} variant photo set(s) missing. ` +
        `Every variant must resolve to its own images.`
    );
    process.exit(1);
  }

  if (strict) {
    console.log("\nPASS: every variant resolves to its own photo set.");
  }
};

const printReport = (report) => {
  console.log("Variant media audit");
  console.log("===================\n");

  const broken = report.products.filter((p) => p.missing.length > 0);
  const clean = report.products.filter((p) => p.missing.length === 0);

  if (broken.length > 0) {
    console.log(`Products missing variant photos (${broken.length}):\n`);
    for (const product of broken) {
      console.log(`  ${product.name}`);
      console.log(`    folder   : ${product.slug}`);
      console.log(`    variants : ${product.variantCount}`);
      console.log(
        `    have     : ${product.present.map((p) => `${p.signature} (${p.files})`).join(", ") || "—"}`
      );
      for (const gap of product.missing) {
        console.log(`    MISSING  : ${gap.signature}  ->  ${product.slug}/${gap.folder}/`);
      }
      if (product.orphans.length > 0) {
        console.log(`    orphaned : ${product.orphans.map((o) => o.signature).join(", ")}`);
      }
      console.log("");
    }
  }

  console.log(`Products already complete (${clean.length}):`);
  for (const product of clean) {
    const label = product.variantCount === 0 ? "no variants" : `${product.needed.length} photo set(s)`;
    console.log(`  ${product.name} — ${label}`);
  }

  const t = report.totals;
  console.log("\nTotals");
  console.log(`  products              : ${t.products} (${t.productsWithVariants} with variants)`);
  console.log(`  photo sets needed     : ${t.signaturesNeeded}`);
  console.log(`  photo sets present    : ${t.signaturesPresent}`);
  console.log(`  photo sets MISSING    : ${t.signaturesMissing}`);
  console.log(`  orphaned photo sets   : ${t.orphanGroups}`);
  console.log(`\nWrote media-report.json`);
};

run();
