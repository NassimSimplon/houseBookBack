// Import the config function from dotenv
import { config } from "dotenv";

// Load environment variables from .env file
const result = config();

if (result.error) {
  throw new Error("Failed to load .env file");
}

// List of required environment variables
const requiredVars = [
  "PORT",
  "DB_USER",
  "DB_PASSWORD",
  "CORS_ORIGIN",
  "NODE_ENV",
  "JWT_SECRET",
  "DB_HOST",
  "EMAIL_USER",
  "EMAIL_PASS",
  "ADMIN",
  "SUB_ADMIN",
  "OWNER",
  "USER"
];

// Check if all required variables are defined
requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

// Export process.env or the necessary variables
export default process.env;
