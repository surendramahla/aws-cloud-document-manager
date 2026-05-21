const express = require("express");
const cors = require("cors");
const path = require("path");
const documentRoutes = require("./routes/documentRoutes");
const systemRoutes = require("./routes/systemRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Parse incoming requests with JSON payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the static frontend playground UI (will build in public folder)
app.use(express.static(path.join(__dirname, "public")));

// Register APIs
app.use("/api/documents", documentRoutes);
app.use("/api/system", systemRoutes);

// Catch-all for API route 404 errors
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `API Endpoint "${req.originalUrl}" not found.`,
      status: 404,
    }
  });
});

// Serve frontend router fallback (for single-page feel)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Centralized error handler middleware
app.use(errorHandler);

module.exports = app;
