// CMS static content page schema (About, Terms, Privacy, etc.).

import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, default: "" },
    content: { type: String, default: "" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Page = mongoose.model("Page", pageSchema);
export default Page;
