// This middleware handles file uploads using multer.
// Files are kept in memory (not on disk) and only images are allowed.

import multer from "multer";

// Keep the uploaded file in memory as a buffer.
const storage = multer.memoryStorage();

// Only allow files whose type starts with "image/".
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Export the configured uploader. Each file can be at most 5 MB.
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
