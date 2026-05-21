/**
 * Centralized error handler middleware.
 * Ensures the API always responds with a valid JSON structure even on server errors.
 */
function errorHandler(err, req, res, next) {
  console.error("🚨 [Server Error]:", err.stack || err.message || err);

  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || "An unexpected internal server error occurred.",
      status: statusCode,
      // Only send stack trace in development
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    }
  });
}

module.exports = errorHandler;
