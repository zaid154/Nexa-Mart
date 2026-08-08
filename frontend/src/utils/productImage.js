// Default image when product photo fails to load
export const PRODUCT_IMAGE_PLACEHOLDER = "/images/products/_placeholder.svg";

// Replace broken product image with placeholder (only once)
export function onProductImageError(event) {
  const img = event.currentTarget;

  // Already tried fallback - do not loop forever
  if (img.dataset.fallback === "1") {
    return;
  }

  img.dataset.fallback = "1";
  img.src = PRODUCT_IMAGE_PLACEHOLDER;
}
