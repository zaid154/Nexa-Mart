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

// Build a SKU for a variant by adding short attribute codes to the base SKU.
export const generateVariantSku = (baseSku, attributes = {}) => {
  const parts = Object.values(attributes)
    .filter(Boolean)
    .map((v) => String(v).slice(0, 3).toUpperCase())
    .join("-");

  if (parts) {
    return `${baseSku}-${parts}`;
  }
  return `${baseSku}-V`;
};
