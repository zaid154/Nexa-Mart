// Variant attributes utility

export const toPlainAttributes = (attributes) => {
  if (!attributes) {
    return {};
  }
  if (attributes instanceof Map) {
    return Object.fromEntries(attributes);
  }
  return { ...attributes };
};
