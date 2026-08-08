// Pull candidate product photos from Wikimedia Commons categories.
//
// This replaces the free-text search in fetchVariantImages.js, which did not
// work at all: searching "Apple iPhone X Silver" matched the word "Apple" in
// scanned nursery catalogues, "Graphite" in an 1881 mining journal, and "Blue"
// in Blue Book Magazine. Every one of the 92 files it downloaded was a scanned
// book or newspaper page — not one product photo.
//
// Commons keeps actual product photography in categories, so we read category
// members directly and never search page text. Anything that is not a plain
// bitmap photograph is dropped before download.
//
//   node src/scripts/media/fetchFromCommons.js
//   node src/scripts/media/fetchFromCommons.js --only apple-airpods-max-silver

import fs from "fs";
import path from "path";

import { STAGING } from "./mediaPaths.js";

const USER_AGENT =
  "NexaMart-media-tool/1.0 (product catalogue imagery; contact: support@nexamart.com)";
const PER_SET = 8;

// Commons categories that actually hold photographs of each product. Curated by
// hand: guessing a category name from the product name does not work, and a
// wrong category is worse than none.
const CATEGORIES = {
  "iphone-13-pro": ["IPhone 13 Pro"],
  "iphone-x": ["IPhone X"],
  "samsung-galaxy-s10": ["Samsung Galaxy S10"],
  "samsung-galaxy-s8": ["Samsung Galaxy S8"],
  "oppo-f19-pro-plus": ["Oppo smartphones"],
  "oppo-k1": ["Oppo smartphones"],
  "realme-xt": ["Realme"],
  "vivo-x21": ["Vivo smartphones"],
  "huawei-matebook-x-pro": ["Huawei laptops", "Huawei MateBook"],
  "apple-airpods-max-silver": ["AirPods Max"],
  "beats-flex-wireless-earphones": ["Beats Electronics"],
  "apple-homepod-mini-cosmic-grey": ["HomePod", "HomePod mini"],
  "amazon-echo-plus": ["Amazon Echo"],
  "rolex-submariner-watch": ["Rolex Submariner"],
  "brown-leather-belt-watch": ["Wristwatches with leather straps", "Wristwatches"],
  "selfie-stick-monopod": ["Selfie sticks"],
};

// Formats that are never a usable product photo.
const BAD_EXTENSION = /\.(pdf|djvu|webm|ogv|ogg|svg|tif|tiff|gif|xcf)$/i;

// Title words that mark a scan, a screenshot or a diagram rather than a photo.
const BAD_TITLE =
  /(screenshot|scan|page[\s_-]*\d|logo|icon|diagram|chart|map|cover|title[\s_-]page|manual|patent|advert)/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const api = async (params) => {
  const url = "https://commons.wikimedia.org/w/api.php?" + new URLSearchParams(params);
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

// Every file in a category, with the metadata needed to judge and credit it.
const filesInCategory = async (category) => {
  const body = await api({
    action: "query",
    generator: "categorymembers",
    gcmtitle: `Category:${category}`,
    gcmtype: "file",
    gcmlimit: "50",
    prop: "imageinfo",
    iiprop: "url|extmetadata|size|mime",
    iiurlwidth: "1600",
    format: "json",
  });

  const pages = body?.query?.pages || {};

  return Object.values(pages)
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info) {
        return null;
      }
      const meta = info.extmetadata || {};
      return {
        title: String(page.title || "").replace(/^File:/, ""),
        url: info.thumburl || info.url,
        sourceUrl: info.descriptionurl || info.url,
        mime: info.mime || "",
        width: info.thumbwidth || info.width || 0,
        height: info.thumbheight || info.height || 0,
        license: meta.LicenseShortName?.value || "",
        author: String(meta.Artist?.value || "").replace(/<[^>]*>/g, "").slice(0, 120),
        category,
      };
    })
    .filter(Boolean);
};

const usable = (file) => {
  if (BAD_EXTENSION.test(file.title) || BAD_TITLE.test(file.title)) {
    return false;
  }
  if (!/^image\/(jpeg|png|webp)$/.test(file.mime)) {
    return false;
  }
  if (Math.min(file.width, file.height) < 500) {
    return false;
  }
  const ratio = file.width / file.height;
  return ratio >= 0.5 && ratio <= 2;
};

const download = async (url, destination) => {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 10 * 1024) {
    throw new Error("too small");
  }
  fs.writeFileSync(destination, buffer);
  return buffer.length;
};

const run = async () => {
  const onlyIndex = process.argv.indexOf("--only");
  const only = onlyIndex > -1 ? process.argv[onlyIndex + 1] : null;

  const slugs = Object.keys(CATEGORIES).filter((s) => !only || s === only);
  const index = [];

  for (const slug of slugs) {
    const target = path.join(STAGING, "_commons", slug);
    fs.mkdirSync(target, { recursive: true });

    console.log(`\n${slug}`);
    const collected = [];
    const seen = new Set();

    for (const category of CATEGORIES[slug]) {
      if (collected.length >= PER_SET) {
        break;
      }

      let files = [];
      try {
        files = await filesInCategory(category);
      } catch (err) {
        console.log(`  Category:${category} failed — ${err.message}`);
        continue;
      }
      await sleep(800);

      const good = files.filter(usable);
      console.log(`  Category:${category} — ${files.length} file(s), ${good.length} usable`);

      for (const file of good) {
        if (collected.length >= PER_SET || seen.has(file.url)) {
          continue;
        }
        seen.add(file.url);

        const n = collected.length + 1;
        const name = `c${n}.jpg`;
        try {
          const bytes = await download(file.url, path.join(target, name));
          collected.push({ ...file, file: name, bytes });
          console.log(`    + ${name}  ${Math.round(bytes / 1024)} KB  ${file.title.slice(0, 70)}`);
        } catch (err) {
          console.log(`    - ${file.title.slice(0, 50)} (${err.message})`);
        }
      }
    }

    fs.writeFileSync(path.join(target, "candidates.json"), JSON.stringify(collected, null, 2));
    index.push({ slug, count: collected.length, files: collected.map((c) => c.file) });

    if (collected.length === 0) {
      console.log("  nothing usable found");
    }
  }

  fs.writeFileSync(
    path.join(STAGING, "_commons", "index.json"),
    JSON.stringify(index, null, 2)
  );

  const total = index.reduce((sum, e) => sum + e.count, 0);
  console.log(`\n${total} candidate(s) across ${index.filter((e) => e.count).length} of ${index.length} product(s).`);
  console.log(`Staged in ${path.join(STAGING, "_commons")}`);
  console.log("These are real photographs, but they still need a human eye: Commons holds");
  console.log("user photos, not catalogue shots, so many will be in-use or wrong-colourway.");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
