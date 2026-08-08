// Render a product's other colourways from a photo of one of them.
//
// This is for solid-colour products — silicone cases, chargers, straps — where
// the item is one flat colour on a plain background. For those, recolouring the
// real photograph is how colourway imagery is normally produced, and the result
// is honest: same product, same lighting, same shape, correct colour.
//
// It is NOT for phones, headphones or anything multi-toned. Those need a real
// photograph; recolouring them produces something misleading.
//
// The recolour is per pixel and only touches pixels that are actually coloured:
// the background, shadows and highlights keep their own luminance, so the
// result keeps the original photo's shading rather than looking like a flat
// paint fill.
//
//   node src/scripts/media/renderColourway.js <slug> --from <folder> --to "Color=Deep Navy"
//   node src/scripts/media/renderColourway.js <slug> --from <folder> --to "Color=Deep Navy" --write

import fs from "fs";
import path from "path";
import sharp from "sharp";

import { parseSignature, slugifySignature } from "../../utils/variantMedia.js";
import { PUBLIC_IMAGES, listFiles, exists } from "./mediaPaths.js";
import { processImage } from "./processImage.js";
import { readManifest, writeManifest } from "./manifest.js";

// Hex values for the colour names the catalogue uses. Mirrors the swatches the
// storefront shows, so the rendered photo and the picker dot agree.
const COLOURS = {
  "deep navy": "#2B3A55",
  "pink citrus": "#F2A093",
  black: "#1A1A1A",
  white: "#F2F2F2",
  "rose gold": "#D6A08C",
  tan: "#B78B60",
  brown: "#6B4226",
  green: "#4C7A52",
  "sky blue": "#9CC4DC",
  "space grey": "#535150",
  silver: "#C9CDD2",
  charcoal: "#37393B",
  sandstone: "#D8CFC0",
  "heather grey": "#A9A9A6",
  "yuzu yellow": "#E8C33B",
  "flame blue": "#2C6FBB",
  blue: "#3B6FB6",
  graphite: "#54524F",
  "prism white": "#F2F3F5",
  "prism black": "#1B1B1D",
  "prism blue": "#3C5A9A",
  "orchid grey": "#8E8A93",
  "fluid black": "#1D1F22",
  "space silver": "#C9CDD2",
  "astral blue": "#2E4A82",
  "piano black": "#0E0E10",
  "pearl blue": "#5B7FB8",
  "pearl white": "#F0EEEA",
  "ruby red": "#8E1C2B",
  "ink blue": "#243B55",
  "sierra blue": "#9BB5CE",
  "midnight black": "#141416",
  "cosmic grey": "#4A4A4C",
  "beats black": "#171717",
  plum: "#6E3F5F",
};

const hexToRgb = (hex) => {
  const v = hex.replace("#", "");
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
};

const rgbToHsl = (r, g, b) => {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const mx = Math.max(R, G, B);
  const mn = Math.min(R, G, B);
  const d = mx - mn;

  let h = 0;
  if (d) {
    if (mx === R) {
      h = 60 * (((G - B) / d) % 6);
    } else if (mx === G) {
      h = 60 * ((B - R) / d + 2);
    } else {
      h = 60 * ((R - G) / d + 4);
    }
  }
  if (h < 0) {
    h += 360;
  }

  const l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, Math.min(1, s), l];
};

const hslToRgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return rgb.map((v) => Math.round(Math.min(255, Math.max(0, (v + m) * 255))));
};

// The colour the product itself is, measured from the photo rather than assumed.
//
// `coverage` is the share of the product that this colour actually accounts
// for. It matters more than the colour itself: a phone photographed screen-on
// has a brightly coloured wallpaper covering a few percent of the frame, and
// picking that as "the product colour" repaints the screen and leaves the
// chassis alone — which is exactly backwards.
const measureProductColour = (data, channels) => {
  const buckets = new Map();
  let coloured = 0;
  let product = 0;

  for (let i = 0; i < data.length; i += channels) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const a = channels === 4 ? data[i + 3] : 255;

    if (isBackground(r, g, b, a)) {
      continue;
    }
    product += 1;

    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    // Skip anything too dark or too washed out to carry a hue.
    if (mx < 40 || mx > 235 || mx - mn < 25) {
      continue;
    }
    coloured += 1;

    const key = `${r >> 4},${g >> 4},${b >> 4}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const top = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!top || product === 0) {
    return null;
  }

  const [r, g, b] = top[0].split(",").map((v) => Number(v) * 16 + 8);
  const [dominantHue] = rgbToHsl(r, g, b);

  // Second pass: how much of the product is that one hue?
  //
  // Counting "pixels that have any colour" is not enough — a phone shot with
  // the screen on has a large, brightly coloured wallpaper, so it scores high
  // while the chassis it should be recolouring is neutral. What matters is
  // whether the product is essentially ONE colour, so count only pixels near
  // the dominant hue.
  let onHue = 0;
  for (let i = 0; i < data.length; i += channels) {
    const [pr, pg, pb] = [data[i], data[i + 1], data[i + 2]];
    const a = channels === 4 ? data[i + 3] : 255;
    if (isBackground(pr, pg, pb, a)) {
      continue;
    }
    const mx = Math.max(pr, pg, pb);
    const mn = Math.min(pr, pg, pb);
    if (mx - mn < 25) {
      continue;
    }
    const [h] = rgbToHsl(pr, pg, pb);
    const delta = Math.min(Math.abs(h - dominantHue), 360 - Math.abs(h - dominantHue));
    if (delta <= 25) {
      onHue += 1;
    }
  }

  return {
    rgb: [r, g, b],
    hsl: rgbToHsl(r, g, b),
    pixels: top[1],
    product,
    coloured,
    // How single-coloured the product is, taken as the weaker of two shares:
    // how much of it carries any colour, and how much of it is the dominant
    // hue. Both have to be high for a recolour to be safe. Measured values:
    //
    //   iPhone 12 silicone case (one flat colour)   99%   recolours perfectly
    //   iPhone 13 Pro, screen on                    77%   repaints the screen
    //   Rolex Submariner (steel + black dial)       14%   repaints the bracelet
    //
    // Hue spread alone does not separate these — the phone's blue wallpaper
    // and blue chassis share a hue, so it scored 83% on that measure alone.
    coverage: Math.min(onHue, coloured) / product,
  };
};

// Is this pixel part of the product, or the plain background behind it?
// The background is bright and colourless; the product may be dark grey, so a
// brightness test alone would eat black products. Transparent pixels are
// background too — several source photos have an alpha channel, and the black
// sitting under a transparent area was being counted as product, which dragged
// the measured lightness far off and mis-scaled every output.
const isBackground = (r, g, b, a = 255) => {
  if (a < 200) {
    return true;
  }
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx > 244 && mx - mn < 12;
};

// Average lightness of the product, used when the source photo has no colour to
// work from (a black case, a silver headphone) and we have to tint it instead.
const measureProductLightness = (data, channels) => {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += channels) {
    if (isBackground(data[i], data[i + 1], data[i + 2])) {
      continue;
    }
    const [, , l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    sum += l;
    count += 1;
  }

  return count === 0 ? null : { mean: sum / count, pixels: count };
};

const recolour = async (sourceFile, targetHex, outFile) => {
  const image = sharp(sourceFile).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const [tr, tg, tb] = hexToRgb(targetHex);
  const [targetH, targetS, targetL] = rgbToHsl(tr, tg, tb);

  // Two ways to do this.
  //
  // If the source product has a real colour (a plum case, a red phone), replace
  // its hue and keep each pixel's own saturation and lightness — that preserves
  // the material's texture and shading exactly.
  //
  // If it does not (black, white, silver, charcoal), there is no hue to replace.
  // Fall back to tinting: map each pixel's lightness onto the target colour,
  // keeping the photo's shading but painting it a new colour. This is weaker,
  // and on a multi-toned product it will look wrong — the caller is warned.
  const measured = measureProductColour(data, info.channels);

  // Refuse rather than produce something misleading.
  //
  // This guard exists because the first run without it produced 22 unusable
  // images: phones whose screens got repainted while the body stayed put,
  // watches whose gold case turned green while the dial stayed black, speakers
  // where only the status LED changed. In every one of those the product was
  // multi-toned or nearly colourless, and the script had no way to succeed —
  // but it happily wrote files anyway. Failing loudly is the correct outcome.
  // Calibrated against the measurements above, not derived from theory: it sits
  // between the case that works (99%) and the best case that does not (77%).
  const MIN_COVERAGE = 0.9;

  if (measured && measured.coverage < MIN_COVERAGE) {
    throw new Error(
      `only ${Math.round(measured.coverage * 100)}% of this product carries a single colour ` +
        `(need ${Math.round(MIN_COVERAGE * 100)}%).\n` +
        "      This photo is multi-toned — a screen, a metal case, a lit panel — so recolouring\n" +
        "      it would repaint the wrong part. Use a real photograph for this colourway."
    );
  }

  const base = measured;
  const tint = base ? null : measureProductLightness(data, info.channels);

  if (!base && !tint) {
    throw new Error("no product pixels found — the photo looks entirely like background");
  }

  // A colourless source can still be tinted, but only if it is genuinely a
  // single-tone object. We cannot measure hue spread on something with no hue,
  // so this is the caller's judgement — say so rather than pretending.
  if (!base) {
    console.log("    note: source has no colour of its own, tinting by lightness — check the result");
  }

  const baseS = base ? base.hsl[1] : 0;
  const baseL = base ? base.hsl[2] : tint.mean;

  const out = Buffer.from(data);

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);

    if (base) {
      // Hue-replace mode. Decide what counts as "product" using raw chroma, not
      // HSL saturation: saturation divides by (1 - |2L-1|), which explodes for
      // near-white pixels, so compression noise in the white background scored
      // as highly saturated and got repainted — coloured speckle beside the
      // product. Chroma has no such blow-up.
      if (mx - mn < 30 || mx > 244) {
        continue;
      }
    } else if (isBackground(r, g, b)) {
      // Tint mode: everything that is not background gets painted.
      continue;
    }

    // The hue is replaced wholesale; only this pixel's saturation and
    // lightness carry over, which is what preserves the original shading.
    const [, s, l] = rgbToHsl(r, g, b);

    // Keep this pixel's own shading, expressed relative to the product's base
    // colour, and re-express it around the target colour.
    const newS = base ? Math.min(1, targetS * (s / Math.max(0.05, baseS))) : targetS;
    const newL = Math.min(0.98, Math.max(0.02, targetL * (l / Math.max(0.05, baseL))));

    const [nr, ng, nb] = hslToRgb(targetH, newS, newL);
    out[i] = nr;
    out[i + 1] = ng;
    out[i + 2] = nb;
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(outFile);

  return base
    ? { mode: "hue-replace", rgb: base.rgb, pixels: base.pixels }
    : { mode: "tint", rgb: null, pixels: tint.pixels };
};

const run = async () => {
  const [slug] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const fromIndex = process.argv.indexOf("--from");
  const toIndex = process.argv.indexOf("--to");
  const write = process.argv.includes("--write");

  if (!slug || fromIndex === -1 || toIndex === -1) {
    console.error('Usage: renderColourway.js <slug> --from <source-folder> --to "Color=Deep Navy" [--write]');
    process.exit(1);
  }

  const fromFolder = process.argv[fromIndex + 1];
  const signature = process.argv[toIndex + 1];
  const attributes = parseSignature(signature);
  const toFolder = slugifySignature(signature);

  const colourName = Object.values(attributes).join(" ").toLowerCase();
  const targetHex = COLOURS[colourName];
  if (!targetHex) {
    console.error(`No hex known for "${colourName}". Add it to COLOURS in this script.`);
    process.exit(1);
  }

  const sourceDir = path.join(PUBLIC_IMAGES, slug, fromFolder);
  if (!exists(sourceDir)) {
    console.error(`Source folder not found: ${sourceDir}`);
    process.exit(1);
  }

  // Work from the largest rendition of each photo we have.
  const sources = listFiles(sourceDir, [".webp"])
    .filter((n) => /^\d+-\d+\.webp$/.test(n))
    .reduce((best, name) => {
      const [index, width] = name.replace(".webp", "").split("-").map(Number);
      if (!best[index] || width > best[index].width) {
        best[index] = { name, width };
      }
      return best;
    }, {});

  const indexes = Object.keys(sources).map(Number).sort((a, b) => a - b);
  if (indexes.length === 0) {
    console.error(`No photos in ${sourceDir}`);
    process.exit(1);
  }

  console.log(`${slug}: ${fromFolder} -> ${toFolder}  (${signature}, ${targetHex})`);
  if (!write) {
    console.log("DRY RUN — pass --write to generate the files.\n");
  }

  const outputDir = path.join(PUBLIC_IMAGES, slug, toFolder);
  const temp = path.join(outputDir, ".tmp");
  const entries = [];

  if (write) {
    fs.mkdirSync(temp, { recursive: true });
  }

  for (const index of indexes) {
    const sourceFile = path.join(sourceDir, sources[index].name);
    console.log(`  ${sources[index].name}`);

    if (!write) {
      continue;
    }

    const recoloured = path.join(temp, `${index}.png`);
    const base = await recolour(sourceFile, targetHex, recoloured);
    const from = base.rgb ? `rgb(${base.rgb.join(",")})` : "no source colour";
    console.log(
      `    ${base.mode}: ${from} over ${base.pixels.toLocaleString()} px -> ${targetHex}`
    );

    // Straight back through the normal pipeline, so the derivatives, budgets
    // and srcsets are produced exactly like every other photo.
    const result = await processImage(recoloured, outputDir, index, { force: true });
    const publicBase = `/images/products/${slug}/${toFolder}`;

    entries.push({
      index,
      folder: toFolder,
      attributes,
      url: `${publicBase}/${result.src}`,
      width: result.width,
      height: result.height,
      srcset: result.srcsetTemplate.split(", ").map((e) => `${publicBase}/${e}`).join(", "),
      srcsetAvif: result.srcsetAvifTemplate.split(", ").map((e) => `${publicBase}/${e}`).join(", "),
      rendered: { from: fromFolder, targetHex },
    });
  }

  if (write) {
    fs.rmSync(temp, { recursive: true, force: true });

    const manifest = readManifest();
    manifest[slug] = [...(manifest[slug] || []).filter((e) => e.folder !== toFolder), ...entries];
    writeManifest(manifest);

    console.log(`\nWrote ${entries.length} photo(s) to ${slug}/${toFolder}/ and updated the manifest.`);
    console.log("Run migrateProductMedia.js --write to show them on the site.");
  }
};

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
