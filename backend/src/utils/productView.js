// Helpers that turn a Product document into a clean object for the frontend.
// They build image URLs and convert Map fields into plain objects.

// Build the list of image URLs for a product.
export const buildImageUrls = (req, product) => {
  const images = product.images || [];
  const urls = [];

  for (const img of images) {
    // If the image already has a URL (Cloudinary/seed), use it.
    if (img.url) {
      urls.push(img.url);
    } else if (img._id && product._id) {
      // Otherwise build a URL that points to our own image route.
      const url = `${req.protocol}://${req.get("host")}/api/products/${product._id}/image/${img._id}`;
      urls.push(url);
    }
    // If neither applies, we just skip this image.
  }

  return urls;
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
    images: buildImageUrls(req, product),
    specs: mapToObj(specs),
    attributes: mapToObj(attributes),
    variants: viewVariants,
  };
};
