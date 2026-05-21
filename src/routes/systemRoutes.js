const express = require("express");
const router = express.Router();
const systemController = require("../controllers/systemController");

// GET /api/system/health - Health check endpoint
router.get("/health", systemController.getHealthCheck);

module.exports = router;
