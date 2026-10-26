import asyncHandler from "express-async-handler";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import { productToView } from "../utils/productView.js";
import { generateSku, generateVariantSku, getCategoryAttributes } from "../utils/sku.js";
import { logActivity } from "../utils/logger.js";
import { processUploadedFiles, removeProductImages } from "../utils/productImages.js";

const parseJson = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const activeFilter = { isDeleted: { $ne: true }, status: { $ne: "draft" } };

// GET /api/products - Search, filter, and paginate products
export const getProducts = asyncHandler(async (req, res) => {
  const { keyword, search, category, brand, featured, minPrice, maxPrice, rating, sort, page = 1, limit = 12 } = req.query;

  const filter = { ...activeFilter };
  const queryTerm = (keyword || search || "").trim();

  if (queryTerm) {
    filter.$or = [
      { name: { $regex: queryTerm, $options: "i" } },
      { description: { $regex: queryTerm, $options: "i" } },
      { brand: { $regex: queryTerm, $options: "i" } },
    ];
  }

  if (category && category !== "All") filter.category = category;
  if (brand && brand !== "All") filter.brand = brand;
  if (featured === "true") filter.isFeatured = true;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (rating) {
    filter.rating = { $gte: Number(rating) };
  }

  const sortMap = {
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 },
    recommended: { rating: -1, createdAt: -1 },
  };
  const sortBy = sortMap[sort] || { createdAt: -1 };

  const pageNum = Math.max(1, Number(page));
  const perPage = Math.min(50, Number(limit));

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

// GET /api/products/collections - Featured homepage collections
export const getCollections = asyncHandler(async (req, res) => {
  const [featured, topRated, deals] = await Promise.all([
    Product.find({ ...activeFilter, isFeatured: true }).select("-images.data").limit(8).lean(),
    Product.find(activeFilter).select("-images.data").sort({ rating: -1 }).limit(8).lean(),
    Product.find({ ...activeFilter, mrp: { $gt: 0 } }).select("-images.data").limit(8).lean(),
  ]);

  res.json({
    featured: featured.map((p) => productToView(req, p)),
    topRated: topRated.map((p) => productToView(req, p)),
    deals: deals.map((p) => productToView(req, p)),
  });
});

// GET /api/products/admin/list - Admin product list
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

// GET /api/products/category-attributes - Get attribute template for category
export const getCategoryAttributeTemplates = (req, res) => {
  const { category } = req.query;
  res.json({ attributes: getCategoryAttributes(category || "default") });
};

// GET /api/products/filters - Get distinct categories and brands
export const getFilters = asyncHandler(async (req, res) => {
  const [categories, brands] = await Promise.all([
    Product.distinct("category", activeFilter),
    Product.distinct("brand", activeFilter),
  ]);

  res.json({
    categories: categories.filter(Boolean),
    brands: brands.filter(Boolean),
  });
});

// GET /api/products/:id - Get single product with reviews
export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true },
  })
    .select("-images.data")
    .lean();

  const isAdmin = req.user?.role === "admin";
  const isDraft = product?.status === "draft";
  if (!product || (!isAdmin && isDraft)) {
    res.status(404);
    throw new Error("Product not found");
  }

  const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 }).lean();
  res.json({ product: productToView(req, product), reviews });
});

// GET /api/products/:id/image/:imageId - Serve stored product image
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

  if (image.url) return res.redirect(image.url);
  if (!image.data) {
    res.status(404);
    throw new Error("Image not found");
  }

  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(image.data);
});

// POST /api/products - Create product (Admin)
export const createProduct = asyncHandler(async (req, res) => {
  const { name, brand, category, description, price, mrp, countInStock, isFeatured, status } = req.body;

  if (!name || !category || price == null) {
    res.status(400);
    throw new Error("Name, category and price are required");
  }

  const sku = await generateSku({ category, brand, name });
  const images = await processUploadedFiles(req.files);
  const variants = parseJson(req.body.variants, []).map((v) => ({
    attributes: v.attributes || {},
    sku: v.sku || generateVariantSku(sku, v.attributes),
    price: v.price != null ? Number(v.price) : Number(price),
    countInStock: Number(v.countInStock) || 0,
  }));

  const product = await Product.create({
    name,
    brand,
    category,
    description,
    price: Number(price),
    mrp: mrp ? Number(mrp) : undefined,
    countInStock: Number(countInStock) || 0,
    isFeatured: isFeatured === "true" || isFeatured === true,
    status: status || (Number(countInStock) > 0 ? "active" : "out_of_stock"),
    sku,
    images,
    variants,
    specs: parseJson(req.body.specs, {}),
    attributes: parseJson(req.body.attributes, {}),
  });

  logActivity(req, "product_created", { productId: product._id, name: product.name });
  res.status(201).json({ product: productToView(req, product) });
});

// PUT /api/products/:id - Update product (Admin)
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) {
    res.status(404);
    throw new Error("Product not found");
  }

  const { name, brand, category, description, price, mrp, countInStock, isFeatured, status } = req.body;

  if (name) product.name = name;
  if (brand !== undefined) product.brand = brand;
  if (category) product.category = category;
  if (description !== undefined) product.description = description;
  if (price != null) product.price = Number(price);
  if (mrp !== undefined) product.mrp = mrp ? Number(mrp) : undefined;
  if (countInStock != null) product.countInStock = Number(countInStock);
  if (isFeatured != null) product.isFeatured = isFeatured === "true" || isFeatured === true;
  if (status) product.status = status;

  if (req.body.specs) product.specs = parseJson(req.body.specs, product.specs);
  if (req.body.attributes) product.attributes = parseJson(req.body.attributes, product.attributes);

  if (req.body.variants) {
    product.variants = parseJson(req.body.variants, []).map((v) => ({
      attributes: v.attributes || {},
      sku: v.sku || generateVariantSku(product.sku, v.attributes),
      price: v.price != null ? Number(v.price) : product.price,
      countInStock: Number(v.countInStock) || 0,
    }));
  }

  if (req.files && req.files.length > 0) {
    const newImages = await processUploadedFiles(req.files);
    product.images = [...product.images, ...newImages];
  }

  await product.save();
  logActivity(req, "product_updated", { productId: product._id });
  res.json({ product: productToView(req, product) });
});

// DELETE /api/products/:id - Soft delete product (Admin)
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product || product.isDeleted) {
    res.status(404);
    throw new Error("Product not found");
  }

  product.isDeleted = true;
  product.status = "archived";
  await product.save();

  logActivity(req, "product_deleted", { productId: product._id });
  res.json({ message: "Product deleted successfully" });
});
