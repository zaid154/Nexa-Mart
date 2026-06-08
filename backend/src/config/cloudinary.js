import { v2 as cloudinary } from "cloudinary";

let configured = false;

export const isCloudinaryEnabled = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export const getCloudinary = () => {
  if (!isCloudinaryEnabled()) return null;
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

export const uploadImageBuffer = async (buffer, folder = "nexamart/products") => {
  const cld = getCloudinary();
  if (!cld) return null;

  return new Promise((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
};

export const deleteCloudinaryImage = async (publicId) => {
  const cld = getCloudinary();
  if (!cld || !publicId) return;
  try {
    await cld.uploader.destroy(publicId);
  } catch {
    // ignore delete errors
  }
};
