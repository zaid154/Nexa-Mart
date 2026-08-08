// Controller for CMS content pages (About, Contact, Privacy, Terms, etc.).

import asyncHandler from "express-async-handler";
import Page from "../models/Page.js";

// The default footer pages. Created automatically the first time the admin
// opens the Pages editor, so there is always something to edit.
const DEFAULT_PAGES = [
  {
    slug: "about",
    title: "About Us",
    content:
      "<h2>About NexaMart</h2><p>NexaMart is a full-stack e-commerce portfolio project built using the <strong>MERN stack</strong> (MongoDB, Express.js, React and Node.js). It demonstrates a production-grade online electronics store with features like user authentication, product catalogue with variants, cart & checkout, Razorpay payment integration, order tracking, admin dashboard and much more.</p><p>This project was designed and developed by <strong>Mohd Zaid</strong> to showcase full-stack development skills.</p>",
  },
  {
    slug: "contact",
    title: "Contact Us",
    content:
      "<h2>Get in Touch</h2><p>Have a question or feedback about this project? Feel free to reach out.</p><ul><li><strong>Email:</strong> trendykart.app@gmail.com</li><li><strong>GitHub:</strong> <a href='https://github.com/zaid154' target='_blank'>github.com/zaid154</a></li><li><strong>LinkedIn:</strong> <a href='https://www.linkedin.com/in/mohd-zaid-794090231/' target='_blank'>Mohd Zaid</a></li></ul>",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content:
      "<h2>Privacy Policy</h2><p>NexaMart is a portfolio/demo project. No real transactions take place on this website.</p><p>Any data you enter (name, email, address) is stored solely for demonstration purposes and is never shared with or sold to any third party. You can request deletion of your data at any time by contacting us.</p>",
  },
  {
    slug: "terms",
    title: "Terms of Service",
    content:
      "<h2>Terms of Service</h2><p>By using NexaMart you acknowledge that this is a <strong>portfolio/demo project</strong> built for educational and interview demonstration purposes. No real products are sold and no real payments are processed.</p><p>All product names, images and brands shown are used for demonstration purposes only and belong to their respective owners.</p>",
  },
  {
    slug: "shipping",
    title: "Shipping Policy",
    content:
      "<h2>Shipping Policy</h2><p>Since NexaMart is a demo project, no actual shipping takes place.</p><p>In a real-world scenario, orders would be dispatched within 24–48 hours and delivered in 3–5 business days. Free shipping would apply on orders above ₹5,000.</p>",
  },
  {
    slug: "returns",
    title: "Returns & Refunds",
    content:
      "<h2>Returns &amp; Refunds</h2><p>As this is a portfolio project, no real purchases or returns occur.</p><p>In a production environment, eligible items could be returned within 7 days of delivery for a full refund, provided they are unused and in original packaging.</p>",
  },
  {
    slug: "faq",
    title: "FAQ",
    content:
      "<h2>Frequently Asked Questions</h2><p><strong>Is this a real store?</strong><br/>No. NexaMart is a portfolio project built by Mohd Zaid to demonstrate full-stack MERN development skills.</p><p><strong>Can I place real orders?</strong><br/>You can go through the full checkout flow, but no real payments are charged and no products are shipped.</p><p><strong>What technologies are used?</strong><br/>React, Node.js, Express, MongoDB, Razorpay (test mode), Cloudinary, and Tailwind CSS.</p><p><strong>How do I contact the developer?</strong><br/>Email: trendykart.app@gmail.com or visit the <a href='/page/contact'>Contact Us</a> page.</p>",
  },
  {
    slug: "sell",
    title: "Sell on NexaMart",
    content:
      "<h2>Sell on NexaMart</h2><p>NexaMart is a single-vendor e-commerce demo project. All products are managed through the admin dashboard.</p><p>This project showcases a complete seller workflow including product listing with variants, inventory management, order fulfilment pipeline, returns processing and analytics dashboard.</p><p>For any queries, contact: <strong>trendykart.app@gmail.com</strong></p>",
  },
];

// Make sure every default page exists. Only missing slugs are inserted, so
// admin edits are never overwritten and a newly added default page still
// appears on an existing database.
const ensureDefaultPages = async () => {
  const existing = await Page.find().select("slug").lean();
  const known = new Set(existing.map((p) => p.slug));

  const missing = DEFAULT_PAGES.filter((p) => !known.has(p.slug));
  if (missing.length > 0) {
    await Page.insertMany(missing);
  }
};

// GET /api/pages  - list published pages (slug + title only) for the footer.
export const listPages = asyncHandler(async (req, res) => {
  await ensureDefaultPages();
  const pages = await Page.find({ isPublished: true })
    .select("slug title")
    .sort({ title: 1 });
  res.json({ pages });
});

// GET /api/pages/:slug  - a single published page.
export const getPage = asyncHandler(async (req, res) => {
  const page = await Page.findOne({ slug: req.params.slug.toLowerCase(), isPublished: true });
  if (!page) {
    res.status(404);
    throw new Error("Page not found");
  }
  res.json({ page });
});

// GET /api/admin/pages  - all pages for the admin editor.
export const adminListPages = asyncHandler(async (req, res) => {
  await ensureDefaultPages();
  const pages = await Page.find().sort({ title: 1 });
  res.json({ pages });
});

// PUT /api/admin/pages/:slug  - update (or create) a page.
export const savePage = asyncHandler(async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  const { title, content, isPublished } = req.body;

  const update = {};
  if (title !== undefined) update.title = title;
  if (content !== undefined) update.content = content;
  if (isPublished !== undefined) update.isPublished = isPublished;

  const page = await Page.findOneAndUpdate(
    { slug },
    { $set: update, $setOnInsert: { slug } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json({ page, message: "Page saved" });
});

// POST /api/admin/pages  - create a brand-new page.
export const createPage = asyncHandler(async (req, res) => {
  const { slug, title, content } = req.body;
  if (!slug || !title) {
    res.status(400);
    throw new Error("Slug and title are required");
  }
  const clean = slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-");
  const exists = await Page.findOne({ slug: clean });
  if (exists) {
    res.status(409);
    throw new Error("A page with this slug already exists");
  }
  const page = await Page.create({ slug: clean, title, content: content || "" });
  res.status(201).json({ page, message: "Page created" });
});

// DELETE /api/admin/pages/:slug  - remove a page.
export const deletePage = asyncHandler(async (req, res) => {
  await Page.findOneAndDelete({ slug: req.params.slug.toLowerCase() });
  res.json({ message: "Page deleted" });
});
