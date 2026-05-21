-- Create Database if not exists (for manual setups)
CREATE DATABASE IF NOT EXISTS cloud_document_db;
USE cloud_document_db;

-- Create documents table with index support
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

-- Pre-seed some mock documents to make the dashboard look alive immediately
INSERT INTO documents (id, file_name, file_size, mime_type, s3_key, uploaded_by, team_id, status, created_at)
VALUES 
('f05d5f22-1d54-4bb0-80de-31a89c7d0d01', 'Q3_Financial_Report.pdf', 2451000, 'application/pdf', 'team-1/seeding-q3-financials.pdf', 'Amish', 'team-1', 'uploaded', NOW() - INTERVAL 2 DAY),
('f05d5f22-1d54-4bb0-80de-31a89c7d0d02', 'AWS_Architecture_Diagram.png', 1048576, 'image/png', 'team-1/seeding-architecture-diagram.png', 'Amish', 'team-1', 'uploaded', NOW() - INTERVAL 1 DAY),
('f05d5f22-1d54-4bb0-80de-31a89c7d0d03', 'Team_Roster.xlsx', 458000, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'team-2/seeding-team-roster.xlsx', 'Sarah', 'team-2', 'uploaded', NOW() - INTERVAL 5 HOUR);
