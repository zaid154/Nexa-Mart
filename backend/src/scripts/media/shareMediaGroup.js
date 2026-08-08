// Mark a product's photo set as shared across all of its variants.
//
// Some variants differ in a way a photograph cannot show: "with 20W adapter" or
// "with cable" is a box contents change, and there is no separate product shot
// for it. Tagging those photos to one particular bundle leaves the other
// variants with an empty gallery for no good reason.
//
// This clears the attributes on a photo set so every variant of the product
// uses it. It does not invent an image and it does not mislead: the photo shows
// the product, which is the same product in both bundles.
//
//   node src/scripts/media/shareMediaGroup.js <slug> <folder>
//   node src/scripts/media/shareMediaGroup.js <slug> <folder> --write

import { readManifest, writeManifest } from "./manifest.js";

const run = () => {
  const [slug, folder] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const write = process.argv.includes("--write");

  if (!slug || !folder) {
    console.error("Usage: shareMediaGroup.js <slug> <folder> [--write]");
    process.exit(1);
  }

  const manifest = readManifest();
  const entries = manifest[slug];

  if (!entries?.length) {
    console.error(`No manifest entries for ${slug}`);
    process.exit(1);
  }

  const matching = entries.filter((entry) => entry.folder === folder);
  if (matching.length === 0) {
    console.error(`No photos in ${slug}/${folder}. Folders present: ${[...new Set(entries.map((e) => e.folder))].join(", ")}`);
    process.exit(1);
  }

  console.log(`${slug}/${folder}: ${matching.length} photo(s)`);
  console.log(`  ${JSON.stringify(matching[0].attributes)}  ->  {} (shown for every variant)`);

  if (!write) {
    console.log("\nDRY RUN — pass --write to apply.");
    return;
  }

  for (const entry of matching) {
    entry.attributes = {};
  }

  writeManifest(manifest);
  console.log("\nManifest updated. Run migrateProductMedia.js --write to apply to the site.");
};

run();
