// Helpers that turn a Product document into a clean object for the frontend.
// They build image URLs and convert Map fields into plain objects.

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

// Build the media list
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
      width: img.width || null,
      height: img.height || null,
      srcset: img.srcset || null,
      srcsetAvif: img.srcsetAvif || null,
    });
  }

  return media;
};

// Convert a Mongoose Map into a plain JavaScript object.
const mapToObj = (m) => {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m);
  if (typeof m === "object") return m;
  return {};
};

// Convert a Product document into a clean object for API responses.
export const productToView = (req, product) => {
  if (!product) return null;

  // Get a plain object version of the product.
  let obj;
  if (product.toObject) {
    obj = product.toObject();
  } else {
    obj = product;
  }

  const { images, specs, attributes, variants, ...rest } = obj;

  return {
    ...rest,
    images: buildImageUrls(req, product),
    media: buildMedia(req, product),
    specs: mapToObj(specs),
    attributes: mapToObj(attributes),
    variants: [],
  };
};
