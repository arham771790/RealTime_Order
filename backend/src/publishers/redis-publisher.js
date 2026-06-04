import env from "../config/env.js";
import { ensureEventId } from "../utils/event-id.js";
import { createRedisClient } from "../utils/redis-client.js";

export class RedisPublisher {
  constructor({ client, channel = env.redis.channel, logger = console } = {}) {
    this.client = client ?? createRedisClient({ logger });
    this.channel = channel;
    this.logger = logger;
    this.isConnected = false;
    this.isErrorHandlerRegistered = false;
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    this.registerErrorHandler();
    await this.client.connect();
    this.isConnected = true;
    this.logger.info({ event: "redis_publisher_connected", channel: this.channel });
  }

  async publish(event, { channel = this.channel } = {}) {
    await this.connect();

    const eventWithId = ensureEventId(event);
    const message = JSON.stringify(eventWithId);
    const receiverCount = await this.client.publish(channel, message);

    this.logger.info({
      event: "redis_event_published",
      channel,
      eventId: eventWithId.eventId,
      receiverCount
    });
    return receiverCount;
  }

  async healthCheck() {
    await this.connect();

    const response = await this.client.ping();
    return response === "PONG";
  }

  async close() {
    if (!this.isConnected) {
      return;
    }

    await this.client.quit();
    this.isConnected = false;
    this.logger.info({ event: "redis_publisher_closed", channel: this.channel });
  }

  registerErrorHandler() {
    if (this.isErrorHandlerRegistered || typeof this.client.on !== "function") {
      return;
    }

    this.client.on("error", (error) => {
      this.logger.error({
        event: "redis_publisher_error",
        channel: this.channel,
        error: error.message
      });
    });
    this.isErrorHandlerRegistered = true;
  }
}

export default RedisPublisher;
