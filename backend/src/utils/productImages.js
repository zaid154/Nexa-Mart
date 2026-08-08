// Helpers for saving and removing product images.
// If Cloudinary is enabled we upload there; otherwise we store the raw buffer.

import { isCloudinaryEnabled, uploadImageBuffer, deleteCloudinaryImage } from "../config/cloudinary.js";

// Turn uploaded files into image objects we can save on the product.
export const processUploadedFiles = async (files = []) => {
  const images = [];

  for (const file of files) {
    if (isCloudinaryEnabled()) {
      // Upload to Cloudinary and keep the URL + public id.
      const result = await uploadImageBuffer(file.buffer);
      images.push({ url: result.secure_url, publicId: result.public_id });
    } else {
      // No Cloudinary: just store the file data directly in MongoDB.
      images.push({ data: file.buffer, contentType: file.mimetype });
    }
  }

  return images;
};

// Remove the given images from a product's image list.
export const removeProductImages = async (images, idsToRemove = []) => {
  for (const rawId of idsToRemove) {
    const id = String(rawId).trim();
    if (!id) {
      continue;
    }

    let img = null;

    // Buffer/cloudinary images are identified by their Mongo subdocument _id.
    if (/^[a-f0-9]{24}$/i.test(id)) {
      img = images.id(id);
    }

    // URL-based images (e.g. seeded CDN links) are matched by their url.
    if (!img) {
      img = images.find((im) => im.url === id);
    }

    // Nothing matched, so skip this id.
    if (!img) {
      continue;
    }

    // If it was on Cloudinary, delete it there too.
    if (img.publicId) {
      await deleteCloudinaryImage(img.publicId);
    }

    img.deleteOne();
  }
};
