// Work out which photos belong to the variant the shopper has selected.
//
// The API sends `product.media`, a list of images that each carry the variant
// attributes they depict. An image tagged { Color: "Deep Navy" } shows only
// when Deep Navy is selected; an image with no tags is a shared shot (packaging,
// in-box contents) that shows for every variant.
//
// This mirrors backend/src/utils/variantMedia.js — keep the two in step.

import { PRODUCT_IMAGE_PLACEHOLDER } from "./productImage.js";

// Does this image belong to this variant? True when every attribute the image
// declares is matched by the variant.
const matches = (imageAttributes, variantAttributes) => {
  const wanted = imageAttributes || {};
  const have = variantAttributes || {};

  for (const key of Object.keys(wanted)) {
    if (have[key] !== wanted[key]) {
      return false;
    }
  }

  return true;
};

// The photos for one variant.
//
// Tagged photos win. Failing that, the shared photos — the right answer for a
// product whose variants differ only by storage or size.
//
// If the product tags its photos but has none for this variant we return
// nothing rather than falling back to the whole list. Falling back is what made
// a Deep Navy case show the Plum photos. An empty gallery is visibly missing; a
// wrong photo silently misleads the shopper. Only a product with no tags at all
// shows everything.
export const mediaForVariant = (media, variantAttributes) => {
  const all = media || [];
  if (all.length === 0) {
    return [];
  }

  const tagged = [];
  const shared = [];
  let anyTagged = false;

  for (const item of all) {
    const attributes = item.attributes || {};

    if (Object.keys(attributes).length === 0) {
      shared.push(item);
      continue;
    }

    anyTagged = true;
    if (matches(attributes, variantAttributes)) {
      tagged.push(item);
    }
  }

  if (tagged.length > 0) {
    return tagged;
  }
  if (shared.length > 0) {
    return shared;
  }

  return anyTagged ? [] : all;
};

// A stable id for one photo set. The gallery uses this to tell "the shopper
// switched to a different colour, show its first photo" apart from "the shopper
// switched storage tier, the photos are the same, leave the view alone".
export const mediaKey = (items) => (items || []).map((item) => item.url).join("|");

// The configuration label for a variant, e.g. "256 GB, Sierra Blue".
export const variantLabel = (variant) =>
  variant ? Object.values(variant.attributes || {}).join(", ") : "";

// The photo for one cart line: the colourway that was actually chosen, not the
// product's default shot. Cart.jsx and Checkout.jsx each carried their own copy
// of this expression and the cart drawer would have been a third.
export const lineImage = (item) => {
  const product = item?.product;
  if (!product) {
    return PRODUCT_IMAGE_PLACEHOLDER;
  }

  return (
    mediaForVariant(mediaFromProduct(product), item.variant?.attributes)[0]?.url ||
    product.images?.[0] ||
    PRODUCT_IMAGE_PLACEHOLDER
  );
};

// Products saved before images carried tags only have `images: [url]`. Build a
// media list from those so the gallery works unchanged.
export const mediaFromProduct = (product) => {
  if (product?.media?.length) {
    return product.media;
  }

  return (product?.images || []).map((url) => ({
    url,
    attributes: {},
    width: null,
    height: null,
    srcset: null,
    srcsetAvif: null,
  }));
};
