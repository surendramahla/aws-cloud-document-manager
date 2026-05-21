# AWS Cloud Document Manager & Secure Upload Engine

An enterprise-ready cloud document management and secure file-processing service. Built on **Node.js, Express, AWS S3 (SDK v3)**, and **MySQL**, this project is an upgraded, production-grade evolution of standard cloud metadata upload assignments.

---

## 🚀 Key Features

*   **Dual-Path Secure Upload Engine**:
    *   **Express Server Proxy**: Files are parsed via Multer in memory, buffered, and streamed directly to S3.
    *   **Direct Browser-to-S3 Uploads (S3 Presigned PUT URLs)**: Large files bypass Express entirely, streaming directly to S3 via browser AJAX. This offloads significant CPU and network load from the Express backend.
*   **Timed Secure Downloads**: S3 Bucket items remain **100% private**. Accessing files triggers an on-demand, cryptographically signed S3 GET URL that securely expires in 15 minutes.
*   **Self-Healing Database Pool**: Utilizes MySQL connection pooling with automatic startup schema verification.
*   **Zero-AWS Local Sandbox (Docker & LocalStack)**: Spins up a local MySQL instance and a mock AWS S3 container (LocalStack), allowing full-featured testing without any AWS fees or active cloud credentials.
*   **Elite Dashboard Frontend**: Sleek glassmorphism visual playground featuring live upload progress bars, drag-and-drop actions, repository searches, dynamic filter tags, and real-time AWS/DB connection nodes.

---

## 🏛️ Project Architecture

```text
aws-cloud-document-manager/
├── .env                  # Port, S3, & Database configurations
├── Dockerfile            # Container definition for Express API
├── docker-compose.yml    # Sandboxed stack (MySQL + LocalStack S3)
├── init.sql              # Database schema definition & seeds
├── package.json          # Dependency tree (AWS SDK v3, Express, Multer)
└── src/
    ├── app.js            # Express app assembly & middlewares
    ├── server.js         # Boot loader & system test routines
    ├── config/
    │   ├── aws.js        # AWS SDK v3 S3 client setup
    │   └── database.js   # MySQL Pool & bootstrapping routines
    ├── controllers/
    │   ├── documentController.js # Upload, metadata CRUD, & download controllers
    │   └── systemController.js   # Uptime and network node diagnostics
    ├── middleware/
    │   ├── errorHandler.js       # Centralized JSON error capture
    │   └── upload.js             # RAM buffer limits for file parsing
    ├── routes/
    │   ├── documentRoutes.js     # REST resources mapping
    │   └── systemRoutes.js       # Diagnostic endpoints mapping
    ├── services/
    │   ├── dbService.js          # DB SQL queries (parameterized)
    │   └── s3Service.js          # S3 SDK operations (presigner & uploaders)
    └── public/                   # Premium Glassmorphic Web App UI
        ├── index.html            # Markup & layout definitions
        ├── styles.css            # Custom CSS animations & orb glow effects
        └── app.js                # Dynamic network triggers & progress bars
```

---

## 🛠️ Step-by-Step Installation

### Method A: Zero-AWS Local Sandbox (Recommended 🐳)

This method runs the database and AWS S3 entirely on your local machine using Docker. **No AWS credentials or credit cards needed!**

1.  **Clone / Copy the directory** and navigate to the project folder:
    ```bash
    cd aws-cloud-document-manager
    ```

2.  **Ensure Docker is running** on your system, then boot the local stack:
    ```bash
    docker-compose up -d
    ```
    *This starts a MySQL database on port `3306` (seeded automatically) and LocalStack S3 on port `4566`.*

3.  **Configure your local `.env`** file (already preconfigured for Docker/LocalStack):
    Ensure the `AWS_ENDPOINT` is pointed to the LocalStack instance:
    ```env
    PORT=5001
    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=root
    DB_PASSWORD=secret
    DB_NAME=cloud_document_db

    AWS_ACCESS_KEY_ID=mock-access-key-id
    AWS_SECRET_ACCESS_KEY=mock-secret-access-key
    AWS_REGION=us-east-1
    S3_BUCKET=cloud-document-bucket
    
    # Crucial for local sandboxing
    AWS_ENDPOINT=http://127.0.0.1:4566
    ```

4.  **Install dependencies and start the Node server**:
    ```bash
    npm install
    npm run dev
    ```
    *Open [http://localhost:5001](http://localhost:5001) in your browser to view your live, fully-functional AWS playground!*

---

### Method B: Connecting to Real AWS Cloud

To point this service to live AWS S3 and RDS:

1.  **Create an S3 Bucket** in your AWS Console (e.g. `my-production-bucket`). Ensure standard private access is maintained.
2.  **Create a database** (MySQL) via RDS or local server.
3.  **Create an IAM user** with S3 Read/Write permissions to acquire credentials.
4.  **Modify your `.env`** file to match:
    ```env
    PORT=5001
    DB_HOST=your-rds-endpoint.amazonaws.com
    DB_PORT=3306
    DB_USER=your_db_username
    DB_PASSWORD=your_db_password
    DB_NAME=your_db_name

    AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
    AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    AWS_REGION=us-east-1
    S3_BUCKET=my-production-bucket
    
    # Leave empty for real AWS S3 Cloud
    AWS_ENDPOINT=
    ```
5.  **Install & Run**:
    ```bash
    npm install
    npm start
    ```

---

## 🔌 API Contract Reference

### 🏥 System Diagnostics
*   **GET `/api/system/health`**
    *   *Description:* Dynamic status of MySQL, S3 buckets, memory footprints, and server uptime. Used to light up connection status nodes in the UI.

### 🗄️ File & Metadata Operations
*   **GET `/api/documents`**
    *   *Description:* Retrieves all files uploaded.
    *   *Query Options:* `search=filename` (partial text filter), `teamId=team` (exact filter).
*   **POST `/api/documents/upload-server`**
    *   *Description:* Classic upload proxied through the Express server.
    *   *Format:* Multipart Form Data (`file` body, `uploadedBy` string, `teamId` string).
*   **GET `/api/documents/upload-url`**
    *   *Description:* Request an S3 cryptographically signed upload URL.
    *   *Query Params:* `fileName=Report.pdf`, `mimeType=application/pdf`, `teamId=team-1`.
    *   *Returns:* `{ uploadUrl: "...", s3Key: "..." }`
*   **POST `/api/documents/metadata`**
    *   *Description:* Saves database record of a successfully uploaded direct file.
    *   *Payload:* `{ fileName, fileSize, mimeType, s3Key, uploadedBy, teamId }`
*   **GET `/api/documents/:id/download`**
    *   *Description:* Securely fetches a temporary, cryptographically signed S3 GET download URL for private files.
    *   *Returns:* `{ downloadUrl: "...", fileName: "..." }`
*   **DELETE `/api/documents/:id`**
    *   *Description:* Deletes the document metadata from the database and purges the object from the AWS S3 bucket.
