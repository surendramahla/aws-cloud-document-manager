const express = require("express");
const router = express.Router();
const documentController = require("../controllers/documentController");
const uploadMiddleware = require("../middleware/upload");

// GET /api/documents - List all documents (with filters)
router.get("/", documentController.listDocuments);

// POST /api/documents/upload-server - Classic upload through server
router.post("/upload-server", uploadMiddleware.single("file"), documentController.uploadFileServerSide);

// GET /api/documents/upload-url - Get S3 presigned upload URL (client-side upload)
router.get("/upload-url", documentController.getPresignedUploadUrl);

// POST /api/documents/metadata - Save document metadata after direct client-to-S3 upload
router.post("/metadata", documentController.saveDocumentMetadata);

// GET /api/documents/:id/download - Get S3 presigned secure download URL
router.get("/:id/download", documentController.getSecureDownloadUrl);

// DELETE /api/documents/:id - Delete file from S3 and metadata from database
router.delete("/:id", documentController.deleteDocument);

module.exports = router;
