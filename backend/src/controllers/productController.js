// This controller handles products: listing, searching, viewing,
// creating, updating and (soft) deleting them.

import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Settings from "../models/Settings.js";
import { DEFAULT_COLLECTIONS } from "../config/storefrontDefaults.js";
import { productToView } from "../utils/productView.js";
import { generateSku, generateVariantSku, getCategoryAttributes } from "../utils/sku.js";
import { logActivity } from "../utils/logger.js";
import { processUploadedFiles, removeProductImages } from "../utils/productImages.js";

// Turn a value into a real boolean (handles the string "true").
const parseBool = (v) => {
  if (v === true || v === "true") {
    return true;
  }
  return false;
};

// Safely parse JSON. If it is already an object or parsing fails, use a fallback.
const parseJson = (val, fallback) => {
  if (!val) {
    return fallback;
  }
  if (typeof val === "object") {
    return val;
  }
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

// Tag freshly uploaded images with the variant each one shows. The admin form
// sends one entry per file, in the order the files were chosen, which is the
// order multer hands them to us.
const applyNewImageAttributes = (images, raw) => {
  const tags = parseJson(raw, null);
  if (!Array.isArray(tags)) {
    return;
  }

  images.forEach((image, i) => {
    if (tags[i] && typeof tags[i] === "object") {
      image.attributes = tags[i];
    }
  });
};

// Do two variants describe the same configuration? Used to keep a variant's
// identity across a save when the form did not send its _id back.
const sameAttributes = (a, b) => {
  const left = a instanceof Map ? Object.fromEntries(a) : a || {};
  const right = b instanceof Map ? Object.fromEntries(b) : b || {};

  const leftKeys = Object.keys(left);
  if (leftKeys.length !== Object.keys(right).length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
};

// Read the product fields from the request body and clean them up.
const parseProductBody = (body) => {
  // Price / mrp / stock come in as strings, so convert them to numbers.
  let price;
  if (body.price != null) {
    price = Number(body.price);
  }

  let mrp;
  if (body.mrp != null && body.mrp !== "") {
    mrp = Number(body.mrp);
  }

  let countInStock;
  if (body.countInStock != null) {
    countInStock = Number(body.countInStock);
  }

  let isFeatured;
  if (body.isFeatured != null) {
    isFeatured = parseBool(body.isFeatured);
  }

  return {
    name: body.name,
    brand: body.brand,
    category: body.category,
    description: body.description,
    price,
    mrp,
    countInStock,
    isFeatured,
    status: body.status,
    specs: body.specs ? parseJson(body.specs, {}) : undefined,
    attributes: body.attributes ? parseJson(body.attributes, {}) : undefined,
    benefits: body.benefits !== undefined ? parseJson(body.benefits, []) : undefined,
    variants: body.variants ? parseJson(body.variants, []) : undefined,
  };
};

// Filter used for the public store: include legacy products that have no status,
// but hide drafts and deleted products.
const activeFilter = {
  isDeleted: { $ne: true },
  $or: [{ status: { $exists: false } }, { status: { $nin: ["draft"] } }],
};

// GET /api/products  - public product list with search, filters and paging.
// The catalog sends several ticked boxes as one comma-separated value, e.g.
// "Apple,Dell". Turn that into { $in: [...] } so all of them match. A single
// value stays a plain match, and an empty/blank value returns undefined so the
// caller can skip the filter instead of matching nothing.
const toFilterValue = (raw) => {
  const list = String(raw)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (list.length === 0) {
    return undefined;
  }
  if (list.length === 1) {
    return list[0];
  }
  return { $in: list };
};

// GET /api/products/collections  - every homepage rail in one round trip.
//
// The homepage renders one rail per configured collection. Fetching them
// individually meant the browser opened seven connections to a free-tier
// server, and could only start once the settings request had come back to say
// which collections exist. The server already knows the collection list, so it
// runs them all here.
export const getCollections = asyncHandler(async (req, res) => {
  const settings = await Settings.getSingleton();
  const configured = settings?.homepage?.collections?.length
    ? settings.homepage.collections
    : DEFAULT_COLLECTIONS;

  const limit = Math.min(24, Number(req.query.limit) || 12);

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
  };

  const results = await Promise.all(
    configured.map((collection) => {
      const filter = { ...activeFilter };
      if (collection.category) {
        filter.category = collection.category;
      }
      if (collection.featured) {
        filter.isFeatured = true;
      }

      return Product.find(filter)
        .select("-images.data")
        .sort(sortMap[collection.sort] || { createdAt: -1 })
        .limit(limit)
        .lean();
    })
  );

  const collections = {};
  configured.forEach((collection, i) => {
    collections[collection.title] = results[i].map((p) => productToView(req, p));
  });

  // Catalogue content changes rarely; let the browser and any proxy reuse it.
  res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
  res.json({ collections, configured });
});

export const getProducts = asyncHandler(async (req, res) => {
  const {
    keyword,
    category,
    brand,
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 12,
    featured,
  } = req.query;

  // Start with the public filter and add the user's filters on top.
  const filter = { ...activeFilter };

  if (keyword) {
    filter.$text = { $search: keyword };
  }
  if (category) {
    const value = toFilterValue(category);
    if (value !== undefined) {
      filter.category = value;
    }
  }
  if (brand) {
    const value = toFilterValue(brand);
    if (value !== undefined) {
      filter.brand = value;
    }
  }
  if (featured === "true") {
    filter.isFeatured = true;
  }

  // Price range filter.
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) {
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice) {
      filter.price.$lte = Number(maxPrice);
    }
  }

  // Map the "sort" query value to a real Mongoose sort object.
  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
  };
  let sortBy = sortMap[sort];
  if (!sortBy) {
    sortBy = { createdAt: -1 };
  }

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(50, Number(limit));

  // Page and count are independent queries, so run them together rather than
  // paying two round trips in a row. `lean` skips hydrating full Mongoose
  // documents; productToView already handles plain objects.
  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("-images.data")
      .sort(sortBy)
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    products: products.map((p) => productToView(req, p)),
    page: pageNum,
    pages: Math.ceil(total / perPage),
    total,
  });
});

// GET /api/products/admin/list  - product list for the admin panel.
export const getAdminProducts = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;

  const filter = { isDeleted: { $ne: true } };

  if (status) {
    filter.status = status;
  }

  // Admin search looks in name, sku and brand.
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(100, Number(limit));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("-images.data")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * perPage)
      .limit(perPage)
      .lean(),
    Product.countDocuments(filter),
  ]);

  res.json({
    products: products.map((p) => productToView(req, p)),
    page: pageNum,
    pages: Math.ceil(total / perPage),
    total,
  });
});

// GET /api/products/category-attributes  - attributes for a category.
export const getCategoryAttributeTemplates = asyncHandler(async (req, res) => {
  const { category } = req.query;
  res.json({ attributes: getCategoryAttributes(category || "default") });
});

// GET /api/products/filters  - the list of categories and brands for filters.
export const getFilters = asyncHandler(async (req, res) => {
  const categories = await Product.distinct("category", activeFilter);
  const brands = await Product.distinct("brand", activeFilter);

  res.json({
    categories: categories.filter(Boolean),
    brands: brands.filter(Boolean),
  });
});

// GET /api/products/:id  - view a single product with its reviews.
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true },
  })
    .select("-images.data")
    .lean();

  // Drafts can only be seen by admins.
  const isAdmin = req.user?.role === "admin";
  const isDraft = product?.status === "draft";
  if (!product || (!isAdmin && isDraft)) {
    res.status(404);
    throw new Error("Product not found");
  }

  const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 }).lean();
  res.json({ product: productToView(req, product), reviews });
});

// GET /api/products/:id/image/:imageId  - serve a product image.
export const getProductImage = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).select("images");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const image = product.images.id(req.params.imageId);
  if (!image) {
    res.status(404);
    throw new Error("Image not found");
  }

  // If the image is just a URL, redirect the browser to it.
  if (image.url) {
    return res.redirect(image.url);
  }

  // Otherwise we must have the raw image data to send.
  if (!image.data) {
    res.status(404);
    throw new Error("Image not found");
  }

  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(image.data);
});

// Check if another product already uses the same name + brand.
const checkDuplicate = async (name, brand, excludeId) => {
  const filter = {
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    brand: brand?.trim() || "",
    isDeleted: { $ne: true },
  };

  // When editing, ignore the product we are currently editing.
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return Product.findOne(filter);
};

// POST /api/products  - create a new product (admin only).
export const createProduct = asyncHandler(async (req, res) => {
  const data = parseProductBody(req.body);

  // Name, category and price are required.
  if (!data.name || !data.category || data.price == null) {
    res.status(400);
    throw new Error("Name, category and price are required");
  }

  // Reject duplicates.
  const dup = await checkDuplicate(data.name, data.brand);
  if (dup) {
    res.status(400);
    throw new Error("A product with this name and brand already exists");
  }

  // Auto-generate the SKU for the product.
  const sku = await generateSku({ category: data.category, brand: data.brand, name: data.name });

  // Save any uploaded images, each tagged with the variant it shows.
  const images = await processUploadedFiles(req.files);
  applyNewImageAttributes(images, req.body.newImageAttributes);

  // Build the variant list (each variant gets a SKU and a price).
  const variants = (data.variants || []).map((v) => {
    let variantSku = v.sku;
    if (!variantSku) {
      variantSku = generateVariantSku(sku, v.attributes);
    }

    let variantPrice = data.price;
    if (v.price != null) {
      variantPrice = Number(v.price);
    }

    return {
      attributes: v.attributes || {},
      sku: variantSku,
      price: variantPrice,
      countInStock: Number(v.countInStock) || 0,
    };
  });

  // Work out the status if one was not provided.
  let status = data.status;
  if (!status) {
    if (data.countInStock > 0) {
      status = "active";
    } else {
      status = "out_of_stock";
    }
  }

  const product = await Product.create({
    ...data,
    sku,
    status,
    specs: data.specs || {},
    attributes: data.attributes || {},
    variants,
    images,
  });

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "product_created",
    meta: { productId: product._id, name: product.name },
    ip: req.ip,
  });

  res.status(201).json({ product: productToView(req, product) });
});

// PUT /api/products/:id  - update an existing product (admin only).
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const parsed = parseProductBody(req.body);

  // If the name is changing, make sure it does not clash with another product.
  if (parsed.name) {
    const brandToCheck = parsed.brand ?? product.brand;
    const dup = await checkDuplicate(parsed.name, brandToCheck, product._id);
    if (dup) {
      res.status(400);
      throw new Error("A product with this name and brand already exists");
    }
  }

  // Copy over only the simple fields that were actually provided.
  const fields = [
    "name",
    "brand",
    "category",
    "description",
    "price",
    "mrp",
    "countInStock",
    "isFeatured",
    "status",
  ];
  for (const f of fields) {
    if (parsed[f] !== undefined) {
      product[f] = parsed[f];
    }
  }

  if (parsed.specs) {
    product.specs = parsed.specs;
  }
  if (parsed.attributes) {
    product.attributes = parsed.attributes;
  }
  if (parsed.benefits !== undefined) {
    product.benefits = parsed.benefits;
  }

  // Update the variants, keeping the ones that already exist.
  //
  // This used to assign a brand new array, which made Mongoose mint a fresh
  // _id for every variant on every save — even a save that changed nothing.
  // Cart lines and order items store that _id (see cartController.findVariant
  // and orderController), so a single admin edit quietly detached every open
  // cart and every order from the configuration it referred to. Matching by
  // _id, then by attributes, keeps those references intact.
  if (parsed.variants) {
    const keptIds = new Set();

    for (const incoming of parsed.variants) {
      const attributes = incoming.attributes || {};

      let existing = null;
      if (incoming._id) {
        existing = product.variants.id(incoming._id);
      }
      if (!existing) {
        existing = product.variants.find((v) => sameAttributes(v.attributes, attributes));
      }

      const price = incoming.price != null ? Number(incoming.price) : product.price;
      const countInStock = Number(incoming.countInStock) || 0;

      if (existing) {
        existing.set({
          attributes,
          price,
          countInStock,
          sku: incoming.sku || existing.sku || generateVariantSku(product.sku, attributes),
        });
        keptIds.add(String(existing._id));
      } else {
        product.variants.push({
          attributes,
          price,
          countInStock,
          sku: incoming.sku || generateVariantSku(product.sku, attributes),
        });
      }
    }

    // Drop only the variants the admin actually removed from the form.
    for (const variant of [...product.variants]) {
      if (variant.isNew) {
        continue;
      }
      if (!keptIds.has(String(variant._id))) {
        variant.deleteOne();
      }
    }
  }

  // Remove any images the admin asked to remove.
  if (req.body.removeImages) {
    let ids = [];
    try {
      ids = JSON.parse(req.body.removeImages);
    } catch {
      ids = String(req.body.removeImages).split(",");
    }
    if (!Array.isArray(ids)) {
      ids = [];
    }
    await removeProductImages(product.images, ids.filter(Boolean));
  }

  // Re-tag the images that are staying, so an admin can correct which variant a
  // photo belongs to without re-uploading it.
  const existingTags = parseJson(req.body.imageAttributes, null);
  if (existingTags && typeof existingTags === "object") {
    for (const image of product.images) {
      const tags = existingTags[String(image._id)];
      if (tags && typeof tags === "object") {
        image.attributes = tags;
      }
    }
  }

  // Add any newly uploaded images.
  if (req.files?.length) {
    const newImages = await processUploadedFiles(req.files);
    applyNewImageAttributes(newImages, req.body.newImageAttributes);
    for (const img of newImages) {
      product.images.push(img);
    }
  }

  const updated = await product.save();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "product_updated",
    meta: { productId: product._id },
    ip: req.ip,
  });

  res.json({ product: productToView(req, updated) });
});

// DELETE /api/products/:id  - soft-delete a product (admin only).
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // We do not really delete it; we just mark it as deleted/hidden.
  product.isDeleted = true;
  product.deletedAt = new Date();
  product.status = "draft";
  product.isActive = false;
  await product.save();

  await logActivity({
    type: "admin_action",
    actor: req.user._id,
    action: "product_deleted",
    meta: { productId: product._id },
    ip: req.ip,
  });

  res.json({ message: "Product removed" });
});
