import { isCloudinaryEnabled, uploadImageBuffer, deleteCloudinaryImage } from "../config/cloudinary.js";

export const processUploadedFiles = async (files = []) => {
  const images = [];

  for (const file of files) {
    if (isCloudinaryEnabled()) {
      const result = await uploadImageBuffer(file.buffer);
      images.push({ url: result.secure_url, publicId: result.public_id });
    } else {
      images.push({ data: file.buffer, contentType: file.mimetype });
    }
  }

  return images;
};

export const removeProductImages = async (images, idsToRemove = []) => {
  for (const rawId of idsToRemove) {
    const id = String(rawId).trim();
    if (!id) continue;

    let img = null;
    // Buffer/cloudinary images are identified by their Mongo subdocument _id.
    if (/^[a-f0-9]{24}$/i.test(id)) img = images.id(id);
    // URL-based images (e.g. seeded CDN links) are matched by their url.
    if (!img) img = images.find((im) => im.url === id);
    if (!img) continue;

    if (img.publicId) await deleteCloudinaryImage(img.publicId);
    img.deleteOne();
  }
};
