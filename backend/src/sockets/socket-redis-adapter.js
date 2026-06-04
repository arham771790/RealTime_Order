import { createAdapter } from "@socket.io/redis-adapter";

import { createRedisClient } from "../utils/redis-client.js";

export class SocketRedisAdapter {
  constructor({
    createAdapterFn = createAdapter,
    io,
    logger = console,
    pubClient,
    subClient
  } = {}) {
    if (!io) {
      throw new Error("SocketRedisAdapter requires a Socket.IO server.");
    }

    if (!pubClient) {
      throw new Error("SocketRedisAdapter requires a Redis publish client.");
    }

    if (!subClient) {
      throw new Error("SocketRedisAdapter requires a Redis subscribe client.");
    }

    this.createAdapterFn = createAdapterFn;
    this.io = io;
    this.isConnected = false;
    this.logger = logger;
    this.pubClient = pubClient;
    this.subClient = subClient;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    await this.pubClient.connect();
    await this.subClient.connect();
    this.io.adapter(this.createAdapterFn(this.pubClient, this.subClient));
    this.isConnected = true;
    this.logger.info({ event: "socket_redis_adapter_connected" });
  }

  async close() {
    if (!this.isConnected) {
      return;
    }

    await Promise.all([this.pubClient.quit(), this.subClient.quit()]);
    this.isConnected = false;
    this.logger.info({ event: "socket_redis_adapter_closed" });
  }
}

export function createSocketRedisAdapter({ io, logger = console } = {}) {
  const pubClient = createRedisClient({ logger });
  const subClient =
    typeof pubClient.duplicate === "function"
      ? pubClient.duplicate()
      : createRedisClient({ logger });

  return new SocketRedisAdapter({
    io,
    logger,
    pubClient,
    subClient
  });
}

export default SocketRedisAdapter;
