const mysql = require("mysql2/promise");

// Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "secret",
  database: process.env.DB_NAME || "cloud_document_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/**
 * Checks the database connection on server startup.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("🟢 [Database] Connected successfully using connection pool.");
    
    // Verify if documents table exists, otherwise create it
    await connection.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_size BIGINT NOT NULL DEFAULT 0,
        mime_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
        s3_key VARCHAR(512) NOT NULL UNIQUE,
        uploaded_by VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
        team_id VARCHAR(100) NOT NULL DEFAULT 'General',
        status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_team_id (team_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    
    connection.release();
    return true;
  } catch (error) {
    console.error("🔴 [Database] Connection failed:", error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
};
