import { createServer } from "node:http";

import { createApp } from "./app.js";
import env from "./config/env.js";
import { connectWithRetry } from "./db/connection.js";
import pool from "./db/pool.js";
import { registerDatabaseShutdown } from "./db/shutdown.js";
import { createOrderChangePipeline } from "./listeners/order-change-pipeline.js";
import { createSocketServer } from "./sockets/socket-server.js";
import { createOrderEventSubscriber } from "./subscribers/order-event-subscriber.js";

export async function startServer({
  app = createApp(),
  dbPool = pool,
  logger = console,
  port = env.port,
  orderChangePipeline,
  orderEventSubscriber
} = {}) {
  await connectWithRetry(dbPool, {
    attempts: env.database.retryAttempts,
    delayMs: env.database.retryDelayMs,
    logger
  });

  const server = createServer(app);

  const { io } = createSocketServer(server, {
    corsOrigin: env.socket.corsOrigin,
    pingIntervalMs: env.socket.pingIntervalMs,
    pingTimeoutMs: env.socket.pingTimeoutMs,
    logger
  });
  const resolvedOrderChangePipeline = orderChangePipeline ?? createOrderChangePipeline({ logger });
  const resolvedOrderEventSubscriber =
    orderEventSubscriber ?? createOrderEventSubscriber({ io, logger });

  try {
    await resolvedOrderEventSubscriber.start();
    await resolvedOrderChangePipeline.start();
  } catch (error) {
    await resolvedOrderEventSubscriber.stop();
    await resolvedOrderChangePipeline.stop();
    throw error;
  }

  server.listen(port, () => {
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
