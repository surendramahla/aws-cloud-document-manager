const { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadBucketCommand, 
  CreateBucketCommand 
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3Client, bucketName } = require("../config/aws");

/**
 * Ensures S3 bucket exists. If not, attempts to create it (highly useful for LocalStack).
 */
async function checkAndCreateBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    console.log(`🟢 [AWS S3] Bucket "${bucketName}" exists and is accessible.`);
    return true;
  } catch (error) {
    // If bucket doesn't exist (404 / NoSuchBucket / NotFound)
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      console.log(`⚠️ [AWS S3] Bucket "${bucketName}" not found. Attempting to create it...`);
      try {
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`🟢 [AWS S3] Bucket "${bucketName}" created successfully!`);
        return true;
      } catch (createError) {
        console.error(`🔴 [AWS S3] Failed to auto-create bucket:`, createError.message);
        return false;
      }
    } else {
      console.error(`🔴 [AWS S3] Error verifying bucket connection:`, error.message);
      return false;
    }
  }
}

/**
 * Uploads a file directly from server memory buffer.
 */
async function uploadFile(key, buffer, mimeType) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  });
  
  await s3Client.send(command);
  return key;
}

/**
 * Generates a timed S3 presigned URL for direct client-side upload (PUT method).
 */
async function getPresignedUploadUrl(key, mimeType, expiresIn = 900) {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: mimeType,
  });

  // Generate the URL (expires in 15 minutes by default)
  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generates a timed S3 presigned URL for secure object download (GET method).
 */
async function getPresignedDownloadUrl(key, expiresIn = 900) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Deletes an object from the S3 bucket.
 */
async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
  return key;
}

module.exports = {
  checkAndCreateBucket,
  uploadFile,
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  deleteFile,
};
