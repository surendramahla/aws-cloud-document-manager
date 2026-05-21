const path = require("path");
// Initialize environment variables from .env file
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("./app");
const { testConnection } = require("./config/database");
const { checkAndCreateBucket } = require("./services/s3Service");

const PORT = process.env.PORT || 5001;

/**
 * Initializes and starts the Express server.
 */
async function bootstrap() {
  console.log("🚀 [Server] Initializing S3 Document Manager Backend...");

  // 1. Check and establish Database pool connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn("⚠️ [Database] Connection warning: Database could not be verified on startup. It might be starting up in Docker.");
  }

  // 2. Check S3 Sdk configuration and pre-create bucket
  const s3Connected = await checkAndCreateBucket();
  if (!s3Connected) {
    console.warn("⚠️ [AWS S3] Connection warning: AWS S3 was not fully accessible. LocalStack S3 container might still be booting.");
  }

  // 3. Start listening on the port
  const server = app.listen(PORT, () => {
    console.log(`🟢 [Server] Server is successfully running in ${process.env.NODE_ENV || 'development'} mode!`);
    console.log(`🔗 [Server] Playground URL: http://localhost:${PORT}`);
  });

  // Handle process shutdown signals for graceful cleanup
  const shutdown = () => {
    console.log("\n🛑 [Server] Shutdown signal received. Closing HTTP server...");
    server.close(() => {
      console.log("🟢 [Server] HTTP server closed. Process terminated.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

// Global exception catchers to prevent unhandled node failures
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception thrown:", error);
  // Optional: Graceful restart or shut down
});

bootstrap();
