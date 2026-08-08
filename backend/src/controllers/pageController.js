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
      "<h2>About NexaMart</h2><p>NexaMart is your destination for premium electronics — genuine products, secure payments and fast delivery across India. We curate the latest smartphones, laptops, audio gear and accessories from the brands you trust.</p><p>Edit this content from Admin → Pages.</p>",
  },
  {
    slug: "contact",
    title: "Contact Us",
    content:
      "<h2>Get in touch</h2><p>Have a question about an order or a product? We’re happy to help.</p><ul><li>Email: support@nexamart.com</li><li>Hours: Mon–Sat, 9am–7pm IST</li></ul><p>Edit this content from Admin → Pages.</p>",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content:
      "<h2>Privacy Policy</h2><p>We respect your privacy and only use your information to process orders and improve your experience. We never sell your personal data.</p><p>Edit this content from Admin → Pages.</p>",
  },
  {
    slug: "terms",
    title: "Terms of Service",
    content:
      "<h2>Terms of Service</h2><p>By using NexaMart you agree to our terms. Prices and availability are subject to change. Please review before placing an order.</p><p>Edit this content from Admin → Pages.</p>",
  },
  {
    slug: "shipping",
    title: "Shipping Policy",
    content:
      "<h2>Shipping Policy</h2><p>Orders are dispatched within 24–48 hours and delivered in 3–5 business days. Free shipping on orders over ₹5,000.</p><p>Edit this content from Admin → Pages.</p>",
  },
  {
    slug: "returns",
    title: "Returns &amp; Refunds",
    content:
      "<h2>Returns &amp; Refunds</h2><p>Not happy with your purchase? Return eligible items within 7 days for a full refund. Items must be unused and in original packaging.</p><p>Edit this content from Admin → Pages.</p>",
  },
  {
    slug: "faq",
    title: "FAQ",
    content:
      "<h2>Frequently Asked Questions</h2><p><strong>How do I track my order?</strong><br/>Go to My Orders and open any order to see its status.</p><p><strong>What payment methods do you accept?</strong><br/>UPI, cards, net banking (via Razorpay) and Cash on Delivery.</p><p>Edit this content from Admin → Pages.</p>",
  },
  {
    slug: "sell",
    title: "Sell on NexaMart",
    content:
      "<h2>Sell on NexaMart</h2><p>NexaMart currently runs as a single-seller marketplace: every product is stocked, priced and dispatched by NexaMart Retail. A public seller onboarding flow is on the roadmap.</p><h3>What exists today</h3><p>Catalogue, pricing, stock and order fulfilment are managed through the <strong>Seller Hub</strong> — the admin console at <code>/admin</code>. From there a seller can add products with photos and variants, set prices and stock per configuration, move orders through the delivery pipeline, approve returns and issue refunds.</p><h3>Want to list your products?</h3><p>Write to <strong>support@nexamart.com</strong> with your brand, category and GST details and our category team will get back to you within two working days.</p><p>Edit this content from Admin → Pages.</p>",
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
