import multer, { MulterError, memoryStorage } from "multer";
import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { fileURLToPath } from "url";
import { unlink } from "fs/promises";

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Constants for upload configuration
const UPLOAD_FOLDER = join(__dirname, "../uploads");

// Ensure uploads directory exists
if (!existsSync(UPLOAD_FOLDER)) {
  mkdirSync(UPLOAD_FOLDER);
}

/**
 * Generate a unique file name based on the current timestamp and random number
 * @param {string} originalName - Original file name
 * @returns {string} - Unique file name with extension
 */
const generateUniqueFileName = (originalName) => {
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = extname(originalName).toLowerCase();
  return `${uniqueSuffix}${ext}`;
};

// Multer storage configuration
const storage = memoryStorage(); // Use memory storage to process files in memory

// File filter for validating file types (allowing all image formats)
const fileFilter = (req, file, cb) => {
  const ALLOWED_FILE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ];

  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  } else {
    // Return an error with a custom message for invalid file types
    return cb(
      new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`)
    );
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  // Remove file size limit or set to a high value
  limits: {
    fileSize: Infinity, // Set to Infinity to allow any file size
  },
});

// Image processing middleware to convert to WebP
const processImages = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(); // No files uploaded, skip processing
  }

  try {
    // Process each file in the array
    await Promise.all(
      req.files.map(async (file) => {
        const webpFileName = generateUniqueFileName(file.originalname.replace(extname(file.originalname), '.webp'));

        // Compress and convert the image to WebP format
        await sharp(file.buffer)
          .webp({ quality: 80 }) // Set quality (0-100)
          .toFile(join(UPLOAD_FOLDER, webpFileName)); // Save the WebP image

        // Optionally, you can set the filename in req for further use
        file.filename = webpFileName; // Save the new filename
      })
    );

    next(); // Proceed to the next middleware
  } catch (error) {
    console.error("Error processing images:", error);
    return res.status(500).json({ error: "Error processing images." });
  }
};

/**
 * Error handling middleware for file uploads
 * Handles both Multer-specific errors and other errors
 */
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof MulterError) {
    // Handle Multer-specific errors, such as file size or limits
    console.error(`[ERROR] Multer error: ${err.message}`);
    return res.status(400).json({
      error: `File upload error: ${err.message}`,
    });
  } else if (err) {
    // Handle other errors, like file type validation
    console.error(`[ERROR] ${err.message}`);
    return res.status(400).json({
      error: `Invalid file: ${err.message}`,
    });
  }
  next(); // Pass the request to the next middleware if no error
};

// Utility function to delete uploaded files
const deleteUploadedFiles = async (images) => {
  const validImages = images.filter((image) => typeof image === "string" && image.trim() !== "");

  await Promise.all(
    validImages.map(async (image) => {
      const imagePath = join(__dirname, "../uploads", basename(image));
      try {
        await unlink(imagePath);
      } catch (err) {
        console.error(`Error deleting image ${imagePath}:`, err.message);
      }
    })
  );
};

const deleteUploadedFile = async (imagePath) => {
  const filePath = join(__dirname, "../uploads", basename(imagePath));
  try {
    await unlink(filePath);
    console.log(`Deleted image: ${filePath}`);
  } catch (err) {
    console.error(`Error deleting image ${filePath}:`, err.message);
  }
};

// Exporting the upload middleware and error handler
export  {
  upload,
  processImages, // Changed to processImages to indicate multiple files
  uploadErrorHandler,
  deleteUploadedFiles,
  deleteUploadedFile
};
