// Multer upload middleware configuration with memory storage.

import multer from "multer";

// Memory storage for buffer-based file processing
const storage = multer.memoryStorage();

// Restrict uploads to image MIME types
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// Multer upload instance with 5MB file limit
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
