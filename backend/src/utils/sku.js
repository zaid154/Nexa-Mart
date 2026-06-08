import Product from "../models/Product.js";

export const CATEGORY_ATTRIBUTES = {
  Smartphones: ["Storage", "RAM", "Color"],
  Laptops: ["Storage", "RAM", "Color"],
  Headphones: ["Color", "Connectivity"],
  Cameras: ["Color", "Sensor"],
  Accessories: ["Color", "Material"],
  default: ["Color", "Size"],
};

export const getCategoryAttributes = (category) =>
  CATEGORY_ATTRIBUTES[category] || CATEGORY_ATTRIBUTES.default;

const prefix = (str) =>
  (str || "GEN")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3) || "GEN";

export const generateSku = async ({ category, brand, name }) => {
  const cat = prefix(category);
  const br = prefix(brand);
  const count = await Product.countDocuments();
  const seq = String(count + 1).padStart(5, "0");
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${cat}-${br}-${seq}-${suffix}`;
};

export const generateVariantSku = (baseSku, attributes = {}) => {
  const parts = Object.values(attributes)
    .filter(Boolean)
    .map((v) => String(v).slice(0, 3).toUpperCase())
    .join("-");
  return parts ? `${baseSku}-${parts}` : `${baseSku}-V`;
};
