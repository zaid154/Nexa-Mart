// This file handles uploading and deleting product images on Cloudinary.
// Cloudinary is only used if the three CLOUDINARY_* keys are set in .env.

import { v2 as cloudinary } from "cloudinary";

// We configure Cloudinary only once and remember it with this flag.
let configured = false;

// Returns true if all three Cloudinary keys are present.
export const isCloudinaryEnabled = () => {
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    return true;
  }
  return false;
};

// Returns the configured Cloudinary object, or null if it is not enabled.
export const getCloudinary = () => {
  if (!isCloudinaryEnabled()) {
    return null;
  }

  // Configure only the first time this function is called.
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
  }

  return cloudinary;
};

// Upload an image (given as a buffer) to Cloudinary and return the result.
export const uploadImageBuffer = async (buffer, folder = "nexamart/products") => {
  const cld = getCloudinary();
  if (!cld) {
    return null;
  }

  // upload_stream uses a callback, so we wrap it in a Promise to use await.
  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
};

// Delete an image from Cloudinary using its public id.
export const deleteCloudinaryImage = async (publicId) => {
  const cld = getCloudinary();
  if (!cld || !publicId) {
    return;
  }

  try {
    await cld.uploader.destroy(publicId);
  } catch {
    // If deleting fails, we just ignore the error on purpose.
  }
};
