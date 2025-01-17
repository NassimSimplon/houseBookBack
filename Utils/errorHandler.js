// Utility function for handling errors
const handleError = (res, error, message = "Internal server error", statusCode = 500) => {
  console.error(`[ERROR] ${message}: ${error.message}`);
  if (error.stack) {
    console.error(error.stack); // Log stack trace for debugging
  }

  // Ensure a valid status code is sent
  const validStatusCode = statusCode >= 100 && statusCode < 600 ? statusCode : 500;

  res.status(validStatusCode).json({
    message: `${message}`,
    error: error.message || "An unexpected error occurred",
  });
};


export default handleError;
