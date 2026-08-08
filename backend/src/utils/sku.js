// Helpers for product SKUs (stock keeping unit codes) and category attributes.

import Product from "../models/Product.js";

// Which attributes (like Storage, RAM, Color) belong to each category.
export const CATEGORY_ATTRIBUTES = {
  Smartphones: ["Storage", "RAM", "Color"],
  Laptops: ["Storage", "RAM", "Color"],
  Headphones: ["Color", "Connectivity"],
  Cameras: ["Color", "Sensor"],
  Accessories: ["Color", "Material"],
  default: ["Color", "Size"],
};

// Return the attributes for a category, or the default list if not found.
export const getCategoryAttributes = (category) => {
  if (CATEGORY_ATTRIBUTES[category]) {
    return CATEGORY_ATTRIBUTES[category];
  }
  return CATEGORY_ATTRIBUTES.default;
};

// Make a short 3-letter prefix from a piece of text (used inside SKUs).
const prefix = (str) => {
  const cleaned = (str || "GEN")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  // If nothing was left after cleaning, use "GEN".
  return cleaned || "GEN";
};

// Build a unique SKU like  CAT-BRD-00012-XYZ
export const generateSku = async ({ category, brand, name }) => {
  const cat = prefix(category);
  const br = prefix(brand);

  // Use the current product count to build a sequence number.
  const count = await Product.countDocuments();
  const seq = String(count + 1).padStart(5, "0");

  // A small random suffix keeps the SKU unique.
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();

  return `${cat}-${br}-${seq}-${suffix}`;
};

// Turn one attribute value into a short code.
//
// Taking the first three characters was not enough: "Prism White" and "Prism
// Black" both became "PRI", so the Galaxy S10's two colourways shipped with the
// same SKU. Using the initial of each word plus the start of the last word
// keeps multi-word values apart, and single words still read sensibly
// ("Graphite" → "GRA", "Prism White" → "PWHI", "128 GB" → "128GB").
const attributeCode = (value) => {
  const words = String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "";
  }
  if (words.length === 1) {
    return words[0].slice(0, 4);
  }

  // Numbers are kept whole — abbreviating "40 mm" and "44 mm" to their first
  // letter would collide again, which is the bug this is here to avoid.
  const lead = words
    .slice(0, -1)
    .map((word) => (/^\d+$/.test(word) ? word : word[0]))
    .join("");

  return `${lead}${words[words.length - 1].slice(0, 3)}`;
};

// Build a SKU for a variant by adding short attribute codes to the base SKU.
export const generateVariantSku = (baseSku, attributes = {}) => {
  const parts = Object.values(attributes).filter(Boolean).map(attributeCode).filter(Boolean).join("-");

  if (parts) {
    return `${baseSku}-${parts}`;
  }
  return `${baseSku}-V`;
};
