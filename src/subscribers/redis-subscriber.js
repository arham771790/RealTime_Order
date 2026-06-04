import { EventEmitter } from "node:events";

import env from "../config/env.js";
import { createRedisClient } from "../utils/redis-client.js";

export class RedisSubscriber extends EventEmitter {
  constructor({ client, channel = env.redis.channel, logger = console } = {}) {
    super();
    this.client = client ?? createRedisClient({ logger });
    this.channel = channel;
    this.logger = logger;
    this.isConnected = false;
    this.isErrorHandlerRegistered = false;
    this.handleMessage = this.handleMessage.bind(this);
  }

  async connect() {
    if (this.isConnected) {
      return;
    }

    this.registerErrorHandler();
    await this.client.connect();
    await this.client.subscribe(this.channel, this.handleMessage);
    this.isConnected = true;
    this.logger.info({ event: "redis_subscriber_connected", channel: this.channel });
  }

  handleMessage(message) {
    try {
      const event = JSON.parse(message);
      this.emit("event", event);
      this.logger.info({ event: "redis_event_received", channel: this.channel });
    } catch (error) {
      this.logger.error({
        event: "redis_message_parse_failed",
        channel: this.channel,
        error: error.message
      });
    }
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

    await this.client.unsubscribe(this.channel);
    await this.client.quit();
    this.isConnected = false;
    this.logger.info({ event: "redis_subscriber_closed", channel: this.channel });
  }

  registerErrorHandler() {
    if (this.isErrorHandlerRegistered || typeof this.client.on !== "function") {
      return;
    }

    this.client.on("error", (error) => {
      this.logger.error({
        event: "redis_subscriber_error",
        channel: this.channel,
        error: error.message
      });
    });
    this.isErrorHandlerRegistered = true;
  }
}

export default RedisSubscriber;
