import "dotenv/config";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

const server = app.listen(env.API_PORT, () => {
  logger.info("api_started", { port: env.API_PORT, environment: env.NODE_ENV });
});
server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("shutdown_started", { signal });
  server.close(async (error) => {
    if (error) logger.error("http_server_close_failed", { error: error.message });
    await prisma.$disconnect();
    process.exit(error ? 1 : 0);
  });
  setTimeout(() => {
    logger.error("shutdown_timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error("unhandled_rejection", { reason: String(reason) });
  void shutdown("unhandledRejection");
});
process.on("uncaughtException", (error) => {
  logger.error("uncaught_exception", { error: error.message });
  void shutdown("uncaughtException");
});
