const multer = require("multer");

// Use memory storage to upload straight to S3 without writing files to local disk
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    // 50MB file size limit to protect server from exhaustion
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types (images, PDFs, documents, logs, CSVs, etc.)
    cb(null, true);
  }
});

module.exports = upload;
