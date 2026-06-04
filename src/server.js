import { createApp } from "./app.js";
import env from "./config/env.js";
import { connectWithRetry } from "./db/connection.js";
import pool from "./db/pool.js";
import { registerDatabaseShutdown } from "./db/shutdown.js";

export async function startServer({
  app = createApp(),
  dbPool = pool,
  logger = console,
  port = env.port
} = {}) {
  await connectWithRetry(dbPool, {
    attempts: env.database.retryAttempts,
    delayMs: env.database.retryDelayMs,
    logger
  });

  const server = app.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`);
  });

  registerDatabaseShutdown({ pool: dbPool, logger });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error("Failed to start HTTP server", error);
    process.exitCode = 1;
  });
}
