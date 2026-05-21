const { S3Client } = require("@aws-sdk/client-s3");

const s3Config = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock-access-key-id",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock-secret-access-key",
  },
};

// Apply custom endpoint if running locally (e.g. http://localhost:4566 for LocalStack)
if (process.env.AWS_ENDPOINT) {
  s3Config.endpoint = process.env.AWS_ENDPOINT;
  s3Config.forcePathStyle = true; // Essential for local S3 emulation
  console.log(`📡 [AWS S3] Configured with custom endpoint: ${process.env.AWS_ENDPOINT}`);
} else {
  console.log(`☁️ [AWS S3] Configured for production AWS S3 in region: ${s3Config.region}`);
}

const s3Client = new S3Client(s3Config);

module.exports = {
  s3Client,
  bucketName: process.env.S3_BUCKET || "cloud-document-bucket",
};
