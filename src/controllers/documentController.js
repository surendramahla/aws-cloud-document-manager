const s3Service = require("../services/s3Service");
const dbService = require("../services/dbService");
const { v4: uuid } = require("uuid");

/**
 * Retrieves all uploaded documents, filtered by search query or team ID.
 */
async function listDocuments(req, res, next) {
  try {
    const { search, teamId } = req.query;
    const documents = await dbService.getAllDocuments({ search, teamId });
    
    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handles standard server-side upload: uploads the file to S3 and registers it in the DB.
 */
async function uploadFileServerSide(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const uploadedBy = req.body.uploadedBy || "Anonymous";
    const teamId = req.body.teamId || "General";
    
    // Generate S3 Key
    const fileExtension = file.originalname.split(".").pop();
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const s3Key = `${teamId.toLowerCase()}/${uuid()}-${cleanFileName}`;

    console.log(`📤 [Upload Server-Side] Starting upload for key: ${s3Key}`);

    // Upload to S3
    await s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

    // Save metadata in database
    const documentRecord = await dbService.createDocument({
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      s3Key: s3Key,
      uploadedBy,
      teamId,
      status: "uploaded",
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully through the server.",
      data: documentRecord,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generates an S3 presigned PUT URL for uploading a file directly from the browser.
 */
async function getPresignedUploadUrl(req, res, next) {
  try {
    const { fileName, mimeType, teamId } = req.query;
    if (!fileName || !mimeType) {
      return res.status(400).json({
        success: false,
        error: "Missing required query parameters: fileName and mimeType are required.",
      });
    }

    const team = teamId || "General";
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const s3Key = `${team.toLowerCase()}/${uuid()}-${cleanFileName}`;

    console.log(`🔑 [Presigned URL] Generating upload link for key: ${s3Key}`);

    // Generate S3 presigned upload URL
    const uploadUrl = await s3Service.getPresignedUploadUrl(s3Key, mimeType);

    res.status(200).json({
      success: true,
      uploadUrl,
      s3Key,
      expiresInSeconds: 900,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Saves document metadata into the database (used in client-side direct upload workflow).
 */
async function saveDocumentMetadata(req, res, next) {
  try {
    const { fileName, fileSize, mimeType, s3Key, uploadedBy, teamId } = req.body;

    if (!fileName || !fileSize || !mimeType || !s3Key) {
      return res.status(400).json({
        success: false,
        error: "Missing metadata. fileName, fileSize, mimeType, and s3Key are required.",
      });
    }

    console.log(`💾 [DB Metadata] Saving record for: ${fileName} (${s3Key})`);

    const documentRecord = await dbService.createDocument({
      fileName,
      fileSize,
      mimeType,
      s3Key,
      uploadedBy: uploadedBy || "Anonymous",
      teamId: teamId || "General",
      status: "uploaded",
    });

    res.status(201).json({
      success: true,
      message: "File metadata saved successfully.",
      data: documentRecord,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generates an S3 presigned GET URL for downloading private bucket files securely.
 */
async function getSecureDownloadUrl(req, res, next) {
  try {
    const { id } = req.params;
    const document = await dbService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found in database." });
    }

    console.log(`🔑 [Presigned URL] Generating download link for: ${document.s3_key}`);

    // Generate S3 presigned download URL
    const downloadUrl = await s3Service.getPresignedDownloadUrl(document.s3_key);

    res.status(200).json({
      success: true,
      downloadUrl,
      fileName: document.file_name,
      expiresInSeconds: 900,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Deletes a file both from AWS S3 and the database metadata tables.
 */
async function deleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const document = await dbService.getDocumentById(id);

    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found in database." });
    }

    console.log(`🗑️ [Delete Engine] Removing file from S3: ${document.s3_key}`);
    
    // Delete from AWS S3
    try {
      await s3Service.deleteFile(document.s3_key);
    } catch (s3Error) {
      console.warn(`⚠️ [S3 Warning] S3 delete failed or file was missing: ${s3Error.message}`);
      // Proceed to clean database even if file was deleted/missing from bucket
    }

    console.log(`🗑️ [Delete Engine] Removing metadata from DB: ${id}`);
    
    // Delete from DB
    await dbService.deleteDocument(id);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully from both S3 and database.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDocuments,
  uploadFileServerSide,
  getPresignedUploadUrl,
  saveDocumentMetadata,
  getSecureDownloadUrl,
  deleteDocument,
};
