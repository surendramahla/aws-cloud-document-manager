const { testConnection } = require("../config/database");
const { checkAndCreateBucket } = require("../services/s3Service");
const { bucketName } = require("../config/aws");

/**
 * Health check endpoint checking backend health, DB connection, and S3 status.
 */
async function getHealthCheck(req, res, next) {
  try {
    // 1. Check Database connection
    const dbConnected = await testConnection();
    
    // 2. Check S3 bucket connectivity
    const s3Connected = await checkAndCreateBucket();

    const isHealthy = dbConnected && s3Connected;

    res.status(isHealthy ? 200 : 503).json({
      success: true,
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {
        database: {
          status: dbConnected ? "connected" : "disconnected",
          host: process.env.DB_HOST || "127.0.0.1",
        },
        s3: {
          status: s3Connected ? "connected" : "disconnected",
          bucketName: bucketName,
          region: process.env.AWS_REGION || "us-east-1",
          customEndpoint: process.env.AWS_ENDPOINT || "none",
        }
      },
      diagnostics: {
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealthCheck,
};
