export const PRODUCT_IMAGE_PLACEHOLDER = "/images/products/_placeholder.svg";

export function onProductImageError(e) {
  const img = e.currentTarget;
  if (img.dataset.fallback === "1") return;
  img.dataset.fallback = "1";
  img.src = PRODUCT_IMAGE_PLACEHOLDER;
}
