// Helpers that turn a Product document into a clean object for the frontend.
// They build image URLs and convert Map fields into plain objects.

import { toPlainAttributes } from "./variantMedia.js";

// Work out the public URL for one image subdocument. Returns null when the
// image has neither a URL nor anything we can stream.
const imageUrl = (req, product, img) => {
  // If the image already has a URL (Cloudinary/seed), use it.
  if (img.url) {
    return img.url;
  }

  // Otherwise build a URL that points to our own image route.
  if (img._id && product._id) {
    return `${req.protocol}://${req.get("host")}/api/products/${product._id}/image/${img._id}`;
  }

  return null;
};

// Build the list of image URLs for a product.
export const buildImageUrls = (req, product) => {
  const images = product.images || [];
  const urls = [];

  for (const img of images) {
    const url = imageUrl(req, product, img);
    if (url) {
      urls.push(url);
    }
  }

  return urls;
};

// Build the richer image list: same order as buildImageUrls, but each entry
// keeps the attributes that say which variant it belongs to, plus the sizes the
// browser needs to pick a source and reserve the box.
export const buildMedia = (req, product) => {
  const images = product.images || [];
  const media = [];

  for (const img of images) {
    const url = imageUrl(req, product, img);
    if (!url) {
      continue;
    }

    media.push({
      _id: img._id ? String(img._id) : null,
      url,
      attributes: toPlainAttributes(img.attributes),
      width: img.width || null,
      height: img.height || null,
      srcset: img.srcset || null,
      srcsetAvif: img.srcsetAvif || null,
    });
  }

  return media;
};

// Convert a Mongoose Map (or plain object) into a normal object.
const mapToObj = (map) => {
  if (!map) {
    return {};
  }
  if (map instanceof Map) {
    return Object.fromEntries(map);
  }
  return map;
};

// Convert a full product document into the shape the frontend expects.
export const productToView = (req, product) => {
  if (!product) {
    return product;
  }

  // Get a plain object version of the product.
  let obj;
  if (product.toObject) {
    obj = product.toObject();
  } else {
    obj = product;
  }

  // Pull out the fields that need special handling.
  const { images, specs, attributes, variants, ...rest } = obj;

  // Convert each variant's attributes map too.
  const viewVariants = (variants || []).map((v) => ({
    ...v,
    attributes: mapToObj(v.attributes),
  }));

  return {
    ...rest,
    // `images` stays a plain array of URL strings: product cards, the catalog
    // and the admin form all read images[0] and must keep working. `media` is
    // the same list with the variant links attached.
    images: buildImageUrls(req, product),
    media: buildMedia(req, product),
    specs: mapToObj(specs),
    attributes: mapToObj(attributes),
    variants: viewVariants,
  };
};
