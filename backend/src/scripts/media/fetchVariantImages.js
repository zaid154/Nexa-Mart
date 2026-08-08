// Download candidate photos for the variant photo sets the audit says are
// missing.
//
// Nothing this script downloads goes near the storefront. Candidates land in
// media-staging/ for a human to look at, because no image search can certify
// that the photo it returned is genuinely the Deep Navy one. Run
// buildReviewSheet.js next, approve what is right, then promoteMedia.js.
//
//   node src/scripts/media/fetchVariantImages.js
//   node src/scripts/media/fetchVariantImages.js --only iphone-12-silicone-case-with-magsafe-plum
//   node src/scripts/media/fetchVariantImages.js --limit 5

import fs from "fs";
import path from "path";

import { catalogue, variantsByProduct } from "../../utils/catalogue.js";
import {
  BASE_GROUP,
  signaturesForVariants,
  slugifySignature,
  parseSignature,
  signatureOf,
} from "../../utils/variantMedia.js";
import { PUBLIC_IMAGES, STAGING, listDirs, listFiles, slugFromImages, exists } from "./mediaPaths.js";

const CANDIDATES_PER_SET = 6;
const USER_AGENT =
  "NexaMart-media-tool/1.0 (product catalogue image sourcing; contact: support@nexamart.com)";

// The catalogue names most products after their default colourway. Searching
// for "Apple AirPods Max Silver" while looking for the Green pair poisons every
// result, so strip the colour suffix by hand — 34 products, a table is safer
// than a regex.
const MODEL_NAMES = {
  "Apple iPhone 13 Pro": "iPhone 13 Pro",
  "Apple iPhone X": "iPhone X",
  "Samsung Galaxy S10": "Samsung Galaxy S10",
  "Samsung Galaxy S8": "Samsung Galaxy S8",
  "OPPO F19 Pro+ 5G": "OPPO F19 Pro Plus",
  "OPPO K1": "OPPO K1",
  "Realme XT": "Realme XT",
  "Vivo X21": "Vivo X21",
  "Huawei MateBook X Pro": "Huawei MateBook X Pro",
  "Apple AirPods Max Silver": "AirPods Max",
  "Beats Flex Wireless Earphones": "Beats Flex",
  "Apple HomePod Mini Cosmic Grey": "HomePod mini",
  "Amazon Echo Plus (2nd Gen)": "Amazon Echo Plus",
  "Rolex Submariner": "Rolex Submariner",
  "Longines Master Collection": "Longines Master Collection",
  "Brown Leather Belt Watch": "leather strap wristwatch",
  "Apple MagSafe Battery Pack": "Apple MagSafe Battery Pack",
  "Apple AirPower Wireless Charger": "wireless charging pad",
  "Apple 20W USB-C Power Adapter": "Apple 20W USB-C power adapter",
  "iPhone 12 Silicone Case with MagSafe — Plum": "iPhone 12 silicone case MagSafe",
  "Selfie Stick Monopod with Tripod": "selfie stick tripod monopod",
};

const modelName = (product) => MODEL_NAMES[product.name] || product.name;

// Most specific first; stop as soon as we have enough candidates.
const queriesFor = (product, attributes) => {
  const model = modelName(product);
  const values = Object.values(attributes).join(" ");
  if (!values) {
    return [`${product.brand} ${model}`, model];
  }

  return [
    `${product.brand} ${model} ${values}`,
    `${model} ${values}`,
    `${values} ${model}`,
    `${product.brand} ${model} ${values} ${product.category}`,
  ];
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Sources ───────────────────────────────────────────────────────

// Openverse aggregates openly-licensed images and needs no API key. It is rate
// limited for anonymous callers, hence the pause between calls.
const searchOpenverse = async (query) => {
  const url =
    "https://api.openverse.org/v1/images/?" +
    new URLSearchParams({
      q: query,
      license_type: "commercial",
      size: "large",
      page_size: "8",
      format: "json",
    });

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    return [];
  }

  const body = await res.json();
  return (body.results || []).map((item) => ({
    source: "openverse",
    url: item.url,
    sourceUrl: item.foreign_landing_url || item.url,
    license: [item.license, item.license_version].filter(Boolean).join(" ").toUpperCase(),
    author: item.creator || "",
    title: item.title || "",
    width: item.width || null,
    height: item.height || null,
  }));
};

// Wikimedia Commons has good coverage of Apple hardware and watches. It blocks
// generic user agents, so the descriptive one above is required.
const searchWikimedia = async (query) => {
  const url =
    "https://commons.wikimedia.org/w/api.php?" +
    new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|extmetadata|size",
      iiurlwidth: "1600",
      format: "json",
      origin: "*",
    });

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    return [];
  }

  const body = await res.json();
  const pages = body?.query?.pages || {};

  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) {
        return null;
      }
      const meta = info.extmetadata || {};
      return {
        source: "wikimedia",
        url: info.thumburl || info.url,
        sourceUrl: info.descriptionurl || info.url,
        license: meta.LicenseShortName?.value || "",
        author: String(meta.Artist?.value || "").replace(/<[^>]*>/g, ""),
        title: page.title || "",
        width: info.thumbwidth || info.width || null,
        height: info.thumbheight || info.height || null,
      };
    })
    .filter(Boolean);
};

// ── Candidate filtering ───────────────────────────────────────────

// Cheap rejects that save review time: too small to be a product shot, or a
// banner-shaped crop that will never square off well.
const plausible = (candidate) => {
  const { width, height } = candidate;
  if (!width || !height) {
    return true; // unknown size — let the human decide
  }
  if (Math.min(width, height) < 500) {
    return false;
  }
  const ratio = width / height;
  return ratio >= 0.55 && ratio <= 1.8;
};

const extensionOf = (url) => {
  const match = String(url).split("?")[0].match(/\.(jpe?g|png|webp)$/i);
  return match ? `.${match[1].toLowerCase()}` : ".jpg";
};

const download = async (url, destination) => {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 8 * 1024) {
    throw new Error("too small");
  }
  fs.writeFileSync(destination, buffer);
  return buffer.length;
};

// ── What is missing ───────────────────────────────────────────────

const missingSets = () => {
  const gaps = [];

  for (const product of catalogue) {
    const slug = slugFromImages(product.images);
    if (!slug) {
      continue;
    }

    const variants = variantsByProduct[product.name] || [];
    const needed = signaturesForVariants(variants);
    const onDisk = new Set(listDirs(path.join(PUBLIC_IMAGES, slug)));

    for (const signature of needed) {
      const folder = slugifySignature(signature);
      if (onDisk.has(folder)) {
        continue;
      }
      gaps.push({
        product,
        slug,
        signature,
        folder,
        attributes: parseSignature(signature),
      });
    }
  }

  return gaps;
};

// ── Main ──────────────────────────────────────────────────────────

const run = async () => {
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex > -1 ? process.argv[onlyIndex + 1] : null;
  const limitIndex = process.argv.indexOf("--limit");
  const limit = limitIndex > -1 ? Number(process.argv[limitIndex + 1]) : Infinity;

  let gaps = missingSets();
  if (only) {
    gaps = gaps.filter((gap) => gap.slug === only);
  }
  gaps = gaps.slice(0, limit);

  console.log(`${gaps.length} photo set(s) to source.\n`);

  const index = [];

  for (const gap of gaps) {
    const target = path.join(STAGING, gap.slug, gap.folder);
    fs.mkdirSync(target, { recursive: true });

    // Resume: skip sets that already have candidates staged.
    const already = listFiles(target, [".jpg", ".jpeg", ".png", ".webp"]);
    if (already.length >= CANDIDATES_PER_SET) {
      console.log(`${gap.slug}/${gap.folder}: ${already.length} candidate(s) already staged, skipping`);
      index.push({ ...describe(gap), candidates: already });
      continue;
    }

    console.log(`${gap.product.name} — ${gap.signature}`);

    const collected = [];
    const seen = new Set();

    for (const query of queriesFor(gap.product, gap.attributes)) {
      if (collected.length >= CANDIDATES_PER_SET) {
        break;
      }

      for (const search of [searchOpenverse, searchWikimedia]) {
        if (collected.length >= CANDIDATES_PER_SET) {
          break;
        }

        let results = [];
        try {
          results = await search(query);
        } catch (err) {
          console.log(`    ${search.name} failed: ${err.message}`);
        }
        await sleep(1200); // stay well inside the anonymous rate limits

        for (const candidate of results) {
          if (collected.length >= CANDIDATES_PER_SET) {
            break;
          }
          if (!candidate.url || seen.has(candidate.url) || !plausible(candidate)) {
            continue;
          }
          seen.add(candidate.url);

          const n = collected.length + 1;
          const file = `c${n}${extensionOf(candidate.url)}`;
          try {
            const bytes = await download(candidate.url, path.join(target, file));
            collected.push({ ...candidate, file, bytes, query });
            console.log(`    + ${file}  ${Math.round(bytes / 1024)} KB  [${candidate.source}] ${query}`);
          } catch (err) {
            console.log(`    - skipped (${err.message})`);
          }
        }
      }
    }

    if (collected.length === 0) {
      console.log(`    NOTHING FOUND — drop this colourway, or drop a photo into ${target}`);
    }

    fs.writeFileSync(
      path.join(target, "candidates.json"),
      JSON.stringify(collected, null, 2)
    );
    index.push({ ...describe(gap), candidates: collected.map((c) => c.file) });
  }

  fs.mkdirSync(STAGING, { recursive: true });
  fs.writeFileSync(path.join(STAGING, "index.json"), JSON.stringify(index, null, 2));

  const empty = index.filter((entry) => entry.candidates.length === 0);
  console.log(`\nStaged candidates for ${index.length - empty.length} of ${index.length} set(s).`);
  if (empty.length > 0) {
    console.log(`${empty.length} set(s) found nothing:`);
    for (const entry of empty) {
      console.log(`  ${entry.slug}/${entry.folder}  (${entry.signature})`);
    }
  }
  console.log(`\nStaging folder: ${STAGING}`);
  console.log("Next: node src/scripts/media/buildReviewSheet.js");
};

const describe = (gap) => ({
  product: gap.product.name,
  brand: gap.product.brand,
  slug: gap.slug,
  folder: gap.folder,
  signature: gap.signature,
  attributes: gap.attributes,
});

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
