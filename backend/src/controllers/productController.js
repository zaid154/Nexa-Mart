import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { productToView } from "../utils/productView.js";
import { generateSku, generateVariantSku, getCategoryAttributes } from "../utils/sku.js";
import { logActivity } from "../utils/logger.js";
import { processUploadedFiles, removeProductImages } from "../utils/productImages.js";

const parseBool = (v) => v === true || v === "true";

const parseJson = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const parseProductBody = (body) => ({
  name: body.name,
  brand: body.brand,
  category: body.category,
  description: body.description,
  price: body.price != null ? Number(body.price) : undefined,
  mrp: body.mrp != null && body.mrp !== "" ? Number(body.mrp) : undefined,
  countInStock: body.countInStock != null ? Number(body.countInStock) : undefined,
  isFeatured: body.isFeatured != null ? parseBool(body.isFeatured) : undefined,
  status: body.status,
  specs: body.specs ? parseJson(body.specs, {}) : undefined,
  attributes: body.attributes ? parseJson(body.attributes, {}) : undefined,
  variants: body.variants ? parseJson(body.variants, []) : undefined,
});

// Include legacy products missing status; exclude only drafts and deleted
const activeFilter = {
  isDeleted: { $ne: true },
  $or: [{ status: { $exists: false } }, { status: { $nin: ["draft"] } }],
};

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

  const filter = { ...activeFilter };

  if (keyword) filter.$text = { $search: keyword };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (featured === "true") filter.isFeatured = true;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
  };
  const sortBy = sortMap[sort] || { createdAt: -1 };

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(50, Number(limit));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("-images.data")
      .sort(sortBy)
      .skip((pageNum - 1) * perPage)
      .limit(perPage),
    Product.countDocuments(filter),
  ]);

  res.json({
    products: products.map((p) => productToView(req, p)),
    page: pageNum,
    pages: Math.ceil(total / perPage),
    total,
  });
});

export const getAdminProducts = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 50 } = req.query;
  const filter = { isDeleted: { $ne: true } };

  if (status) filter.status = status;
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
      .limit(perPage),
    Product.countDocuments(filter),
  ]);

  res.json({
    products: products.map((p) => productToView(req, p)),
    page: pageNum,
    pages: Math.ceil(total / perPage),
    total,
  });
});

export const getCategoryAttributeTemplates = asyncHandler(async (req, res) => {
  const { category } = req.query;
  res.json({ attributes: getCategoryAttributes(category || "default") });
});

export const getFilters = asyncHandler(async (req, res) => {
  const [categories, brands] = await Promise.all([
    Product.distinct("category", activeFilter),
    Product.distinct("brand", activeFilter),
  ]);
  res.json({ categories: categories.filter(Boolean), brands: brands.filter(Boolean) });
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true },
  }).select("-images.data");

  const isAdmin = req.user?.role === "admin";
  const isDraft = product?.status === "draft";
  if (!product || (!isAdmin && isDraft)) {
    res.status(404);
    throw new Error("Product not found");
  }

  const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 });
  res.json({ product: productToView(req, product), reviews });
});

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

  if (image.url) {
    return res.redirect(image.url);
  }

  if (!image.data) {
    res.status(404);
    throw new Error("Image not found");
  }

  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(image.data);
});

const checkDuplicate = async (name, brand, excludeId) => {
  const filter = {
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    brand: brand?.trim() || "",
    isDeleted: { $ne: true },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  return Product.findOne(filter);
};

export const createProduct = asyncHandler(async (req, res) => {
  const data = parseProductBody(req.body);

  if (!data.name || !data.category || data.price == null) {
    res.status(400);
    throw new Error("Name, category and price are required");
  }

  const dup = await checkDuplicate(data.name, data.brand);
  if (dup) {
    res.status(400);
    throw new Error("A product with this name and brand already exists");
  }

  const sku = await generateSku({ category: data.category, brand: data.brand, name: data.name });

  const images = await processUploadedFiles(req.files);

  const variants = (data.variants || []).map((v) => ({
    attributes: v.attributes || {},
    sku: v.sku || generateVariantSku(sku, v.attributes),
    price: v.price != null ? Number(v.price) : data.price,
    countInStock: Number(v.countInStock) || 0,
  }));

  const status = data.status || (data.countInStock > 0 ? "active" : "out_of_stock");

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

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const parsed = parseProductBody(req.body);

  if (parsed.name) {
    const dup = await checkDuplicate(parsed.name, parsed.brand ?? product.brand, product._id);
    if (dup) {
      res.status(400);
      throw new Error("A product with this name and brand already exists");
    }
  }

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
  fields.forEach((f) => {
    if (parsed[f] !== undefined) product[f] = parsed[f];
  });
  if (parsed.specs) product.specs = parsed.specs;
  if (parsed.attributes) product.attributes = parsed.attributes;
  if (parsed.variants) {
    product.variants = parsed.variants.map((v) => ({
      attributes: v.attributes || {},
      sku: v.sku || generateVariantSku(product.sku, v.attributes),
      price: v.price != null ? Number(v.price) : product.price,
      countInStock: Number(v.countInStock) || 0,
    }));
  }

  if (req.body.removeImages) {
    let ids = [];
    try {
      ids = JSON.parse(req.body.removeImages);
    } catch {
      ids = String(req.body.removeImages).split(",");
    }
    if (!Array.isArray(ids)) ids = [];
    await removeProductImages(product.images, ids.filter(Boolean));
  }

  if (req.files?.length) {
    const newImages = await processUploadedFiles(req.files);
    newImages.forEach((img) => product.images.push(img));
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

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

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
