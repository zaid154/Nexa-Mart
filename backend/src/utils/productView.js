export const buildImageUrls = (req, product) =>
  (product.images || [])
    .map((img) => {
      if (img.url) return img.url;
      if (img._id && product._id) {
        return `${req.protocol}://${req.get("host")}/api/products/${product._id}/image/${img._id}`;
      }
      return null;
    })
    .filter(Boolean);

const mapToObj = (map) => {
  if (!map) return {};
  if (map instanceof Map) return Object.fromEntries(map);
  return map;
};

export const productToView = (req, product) => {
  if (!product) return product;
  const obj = product.toObject ? product.toObject() : product;
  const { images, specs, attributes, variants, ...rest } = obj;
  return {
    ...rest,
    images: buildImageUrls(req, product),
    specs: mapToObj(specs),
    attributes: mapToObj(attributes),
    variants: (variants || []).map((v) => ({
      ...v,
      attributes: mapToObj(v.attributes),
    })),
  };
};
