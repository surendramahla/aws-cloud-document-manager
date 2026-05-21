const { pool } = require("../config/database");
const { v4: uuid } = require("uuid");

/**
 * Retrieves all documents from the database with optional search and team filters.
 */
async function getAllDocuments(filters = {}) {
  let query = "SELECT * FROM documents WHERE 1=1";
  const params = [];

  if (filters.search) {
    query += " AND file_name LIKE ?";
    params.push(`%${filters.search}%`);
  }

  if (filters.teamId) {
    query += " AND team_id = ?";
    params.push(filters.teamId);
  }

  // Sort by newest first
  query += " ORDER BY created_at DESC";

  const [rows] = await pool.query(query, params);
  return rows;
}

/**
 * Retrieves a single document by its UUID.
 */
async function getDocumentById(id) {
  const [rows] = await pool.query("SELECT * FROM documents WHERE id = ?", [id]);
  return rows[0] || null;
}

/**
 * Inserts a new file metadata record into the database.
 */
async function createDocument(data) {
  const id = data.id || uuid();
  const {
    fileName,
    fileSize,
    mimeType,
    s3Key,
    uploadedBy = "Anonymous",
    teamId = "General",
    status = "uploaded",
  } = data;

  const query = `
    INSERT INTO documents 
    (id, file_name, file_size, mime_type, s3_key, uploaded_by, team_id, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [id, fileName, fileSize, mimeType, s3Key, uploadedBy, teamId, status];

  await pool.query(query, params);
  return { id, ...data };
}

/**
 * Deletes a document metadata record by ID.
 */
async function deleteDocument(id) {
  const [result] = await pool.query("DELETE FROM documents WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

/**
 * Updates the status of an uploaded document.
 */
async function updateDocumentStatus(id, status) {
  const [result] = await pool.query(
    "UPDATE documents SET status = ? WHERE id = ?",
    [status, id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllDocuments,
  getDocumentById,
  createDocument,
  deleteDocument,
  updateDocumentStatus,
};
