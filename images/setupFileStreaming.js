import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get the current directory path from the module URL
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files securely
const setupFileStreaming = (app) => {
  // Middleware for serving files from the uploads folder
  app.use(
    "/uploads",
    express.static(join(__dirname, "../uploads"), {
      setHeaders: (res, filePath) => {
        // Set security headers for file responses
        res.setHeader("Content-Disposition", "inline"); // Allow inline file display
        res.setHeader("X-Content-Type-Options", "nosniff"); // Prevent MIME type sniffing
        res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      },
    })
  );

  console.log("File streaming enabled for /uploads route.");
};

export default setupFileStreaming;
