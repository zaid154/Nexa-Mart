// Helpers for linking product photos to the variant they belong to.
//
// The rule, in one sentence: an image matches a variant when every attribute
// the image declares is present on the variant with the same value. An image
// that declares nothing is generic and matches everything.
//
// So an image tagged { Color: "Deep Navy" } shows for "128 GB / Deep Navy" and
// "256 GB / Deep Navy" but can never show for Plum, and an untagged image shows
// for all of them.

// Attributes that change what the product looks like. Only these earn their own
// photos; picking 256 GB instead of 128 GB does not change the photograph, so
// both storage tiers share whatever the colour group provides.
export const VISUAL_ATTRIBUTE_KEYS = [
  "Color",
  "Colour",
  "Dial",
  "Bracelet",
  "Strap",
  "Material",
  "Finish",
  "Pattern",
  "Style",
  "Bundle",
];

// The folder used for photos that belong to no particular variant.
export const BASE_GROUP = "_base";

// Turn a Mongoose Map (or a plain object, or nothing) into a normal object.
export const toPlainAttributes = (attributes) => {
  if (!attributes) {
    return {};
  }
  if (attributes instanceof Map) {
    return Object.fromEntries(attributes);
  }
  return { ...attributes };
};

// Keep only the attributes that change how the product looks.
export const visualAttributes = (attributes) => {
  const all = toPlainAttributes(attributes);
  const visual = {};

  for (const key of Object.keys(all)) {
    if (VISUAL_ATTRIBUTE_KEYS.includes(key) && String(all[key]).trim()) {
      visual[key] = all[key];
    }
  }

  return visual;
};

// A stable string that identifies one set of photos, e.g. "Color=Deep Navy".
// Keys are sorted so the same combination always produces the same signature.
export const signatureOf = (attributes) => {
  const visual = visualAttributes(attributes);
  const keys = Object.keys(visual).sort();

  if (keys.length === 0) {
    return BASE_GROUP;
  }

  return keys.map((key) => `${key}=${visual[key]}`).join("&");
};

// Turn a signature into a folder name: "Color=Deep Navy" -> "color-deep-navy".
export const slugifySignature = (signature) => {
  if (!signature || signature === BASE_GROUP) {
    return BASE_GROUP;
  }

  return signature
    .split("&")
    .map((pair) =>
      pair
        .replace("=", "-")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    )
    .join("_");
};

// Parse a signature back into an attributes object.
export const parseSignature = (signature) => {
  if (!signature || signature === BASE_GROUP) {
    return {};
  }

  const attributes = {};
  for (const pair of signature.split("&")) {
    const at = pair.indexOf("=");
    if (at > 0) {
      attributes[pair.slice(0, at)] = pair.slice(at + 1);
    }
  }

  return attributes;
};

// Does this image belong to this variant? True when every attribute the image
// declares is matched by the variant. An image with no attributes matches all.
export const imageMatchesVariant = (imageAttributes, variantAttributes) => {
  const wanted = toPlainAttributes(imageAttributes);
  const have = toPlainAttributes(variantAttributes);

  for (const key of Object.keys(wanted)) {
    if (have[key] !== wanted[key]) {
      return false;
    }
  }

  return true;
};

// Pick the photos for one variant.
//
// Photos tagged for this variant win. Failing that we show the generic photos,
// which is the right answer for a product whose variants differ only by storage
// or size.
//
// The last case is the one that matters most: a product that tags its photos
// but has nothing for this particular variant returns NOTHING rather than
// falling back to the full list. Falling back is what produced the original
// bug — a Deep Navy case showing the Plum photos. An empty gallery is visibly
// missing; a wrong photo silently misleads the shopper. Only a product with no
// tagged photos at all (nothing has been sorted into variants yet) falls back
// to showing everything.
export const mediaForVariant = (media, variantAttributes) => {
  const all = media || [];
  if (all.length === 0) {
    return [];
  }

  const tagged = [];
  const generic = [];
  let anyTagged = false;

  for (const item of all) {
    const attributes = toPlainAttributes(item.attributes);

    if (Object.keys(attributes).length === 0) {
      generic.push(item);
      continue;
    }

    anyTagged = true;
    if (imageMatchesVariant(attributes, variantAttributes)) {
      tagged.push(item);
    }
  }

  if (tagged.length > 0) {
    return tagged;
  }
  if (generic.length > 0) {
    return generic;
  }

  return anyTagged ? [] : all;
};

// Every distinct photo set a product needs, derived from its variants.
// A product with no variants needs only the base group.
export const signaturesForVariants = (variants) => {
  const seen = new Set();

  for (const variant of variants || []) {
    seen.add(signatureOf(variant.attributes));
  }

  if (seen.size === 0) {
    seen.add(BASE_GROUP);
  }

  return [...seen];
};
