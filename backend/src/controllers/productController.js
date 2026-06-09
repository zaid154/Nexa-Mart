// This controller handles products: listing, searching, viewing,
// creating, updating and (soft) deleting them.

import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
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
    filter.category = category;
  }
  if (brand) {
    filter.brand = brand;
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

  // Get the products for this page.
  const products = await Product.find(filter)
    .select("-images.data")
    .sort(sortBy)
    .skip((pageNum - 1) * perPage)
    .limit(perPage);

  // Get the total count so we can work out how many pages there are.
  const total = await Product.countDocuments(filter);

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

  const products = await Product.find(filter)
    .select("-images.data")
    .sort({ createdAt: -1 })
    .skip((pageNum - 1) * perPage)
    .limit(perPage);

  const total = await Product.countDocuments(filter);

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
  }).select("-images.data");

  // Drafts can only be seen by admins.
  const isAdmin = req.user?.role === "admin";
  const isDraft = product?.status === "draft";
  if (!product || (!isAdmin && isDraft)) {
    res.status(404);
    throw new Error("Product not found");
  }

  const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 });
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

  // Save any uploaded images.
  const images = await processUploadedFiles(req.files);

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

  // Rebuild the variants if new ones were sent.
  if (parsed.variants) {
    product.variants = parsed.variants.map((v) => {
      let variantSku = v.sku;
      if (!variantSku) {
        variantSku = generateVariantSku(product.sku, v.attributes);
      }

      let variantPrice = product.price;
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

  // Add any newly uploaded images.
  if (req.files?.length) {
    const newImages = await processUploadedFiles(req.files);
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
