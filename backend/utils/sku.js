// SKU generation and category attribute helpers

import Product from "../models/Product.js";

export const CATEGORY_ATTRIBUTES = {
  Smartphones: ["Storage", "RAM", "Color"],
  Laptops: ["Storage", "RAM", "Color"],
  Headphones: ["Color", "Connectivity"],
  Cameras: ["Color", "Sensor"],
  Accessories: ["Color", "Material"],
  default: ["Color", "Size"],
};

export const getCategoryAttributes = (category) => {
  return CATEGORY_ATTRIBUTES[category] || CATEGORY_ATTRIBUTES.default;
};

// Generate 3-letter alphanumeric uppercase prefix
const prefix = (str) => {
  const cleaned = (str || "GEN")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);

  return cleaned || "GEN";
};

// Generate base SKU: CAT-BRD-SEQ-RANDOM
export const generateSku = async ({ category, brand }) => {
  const cat = prefix(category);
  const br = prefix(brand);
  const count = await Product.countDocuments();
  const seq = String(count + 1).padStart(5, "0");
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();

  return `${cat}-${br}-${seq}-${suffix}`;
};

// Generate deterministic short code for attribute value
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

  const lead = words
    .slice(0, -1)
    .map((word) => (/^\d+$/.test(word) ? word : word[0]))
    .join("");

  return `${lead}${words[words.length - 1].slice(0, 3)}`;
};

// Generate variant SKU by appending attribute codes to base SKU
export const generateVariantSku = (baseSku, attributes = {}) => {
  const parts = Object.values(attributes).filter(Boolean).map(attributeCode).filter(Boolean).join("-");

  if (parts) {
    return `${baseSku}-${parts}`;
  }
  return `${baseSku}-V`;
};
