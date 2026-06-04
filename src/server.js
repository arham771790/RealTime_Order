import { createServer } from "node:http";

import { createApp } from "./app.js";
import env from "./config/env.js";
import { connectWithRetry } from "./db/connection.js";
import pool from "./db/pool.js";
import { registerDatabaseShutdown } from "./db/shutdown.js";
import { createOrderChangePipeline } from "./listeners/order-change-pipeline.js";
import { createOutboxProcessor } from "./outbox/outbox-processor.js";
import { createSocketServer } from "./sockets/socket-server.js";
import { createSocketRedisAdapter } from "./sockets/socket-redis-adapter.js";
import { createOrderEventSubscriber } from "./subscribers/order-event-subscriber.js";

export async function startServer({
  app = createApp(),
  dbPool = pool,
  logger = console,
  port = env.port,
  orderChangePipeline,
  orderEventSubscriber,
  outboxProcessor,
  socketRedisAdapter
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
  const resolvedOutboxProcessor = outboxProcessor ?? createOutboxProcessor({ dbPool, logger });
  const resolvedSocketRedisAdapter =
    socketRedisAdapter ??
    (env.socket.redisAdapterEnabled ? createSocketRedisAdapter({ io, logger }) : null);

  try {
    await resolvedSocketRedisAdapter?.connect();
    await resolvedOrderEventSubscriber.start();
    await resolvedOrderChangePipeline.start();
    await resolvedOutboxProcessor.start();
  } catch (error) {
    await resolvedOutboxProcessor.stop();
    await resolvedOrderEventSubscriber.stop();
    await resolvedOrderChangePipeline.stop();
    await resolvedSocketRedisAdapter?.close();
    throw error;
  }

  server.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`);
  });

  registerDatabaseShutdown({
    pool: dbPool,
    logger,
    shutdownTasks: [
      {
        name: "outbox_processor",
        handler: () => resolvedOutboxProcessor.stop()
      },
      {
        name: "order_event_subscriber",
        handler: () => resolvedOrderEventSubscriber.stop()
      },
      {
        name: "order_change_pipeline",
        handler: () => resolvedOrderChangePipeline.stop()
      },
      {
        name: "socket_redis_adapter",
        handler: () => resolvedSocketRedisAdapter?.close()
      },
      {
        name: "http_server",
        handler: () =>
          new Promise((resolve, reject) => {
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          })
      }
    ]
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error("Failed to start HTTP server", error);
    process.exitCode = 1;
  });
}
