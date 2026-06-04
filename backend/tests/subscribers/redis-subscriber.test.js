import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { RedisSubscriber } from "../../src/subscribers/redis-subscriber.js";

class FakeRedisClient extends EventEmitter {
  constructor() {
    super();
    this.messageHandler = null;
    this.connect = jest.fn().mockResolvedValue();
    this.subscribe = jest.fn().mockImplementation((_channel, handler) => {
      this.messageHandler = handler;
      return Promise.resolve();
    });
    this.unsubscribe = jest.fn().mockResolvedValue();
    this.ping = jest.fn().mockResolvedValue("PONG");
    this.quit = jest.fn().mockResolvedValue();
  }
}

function createLogger() {
  return {
    info: jest.fn(),
    error: jest.fn()
  };
}

describe("RedisSubscriber", () => {
  it("connects and subscribes to the configured channel", async () => {
    const client = new FakeRedisClient();
    const subscriber = new RedisSubscriber({ client, channel: "order_events" });

    await subscriber.connect();

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.subscribe).toHaveBeenCalledWith("order_events", expect.any(Function));
  });

  it("emits parsed events from redis messages", async () => {
    const client = new FakeRedisClient();
    const subscriber = new RedisSubscriber({ client, channel: "order_events" });
    const eventHandler = jest.fn();

    subscriber.on("event", eventHandler);
    await subscriber.connect();
    client.messageHandler(JSON.stringify({ eventId: "evt-1", operation: "UPDATE" }));

    expect(eventHandler).toHaveBeenCalledWith({ eventId: "evt-1", operation: "UPDATE" });
  });

  it("logs invalid redis messages without emitting events", async () => {
    const client = new FakeRedisClient();
    const logger = createLogger();
    const subscriber = new RedisSubscriber({ client, channel: "order_events", logger });
    const eventHandler = jest.fn();

    subscriber.on("event", eventHandler);
    await subscriber.connect();
    client.messageHandler("{bad-json");

    expect(eventHandler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith({
      event: "redis_message_parse_failed",
      channel: "order_events",
      error: expect.any(String)
    });
  });

  it("checks redis health with ping", async () => {
    const subscriber = new RedisSubscriber({ client: new FakeRedisClient() });

    await expect(subscriber.healthCheck()).resolves.toBe(true);
  });

  it("unsubscribes and closes the client", async () => {
    const client = new FakeRedisClient();
    const subscriber = new RedisSubscriber({ client, channel: "order_events" });

    await subscriber.connect();
    await subscriber.close();

    expect(client.unsubscribe).toHaveBeenCalledWith("order_events");
    expect(client.quit).toHaveBeenCalledTimes(1);
  });

  it("logs client errors", async () => {
    const client = new FakeRedisClient();
    const logger = createLogger();
    const subscriber = new RedisSubscriber({ client, channel: "order_events", logger });

    await subscriber.connect();
    client.emit("error", new Error("redis down"));

    expect(logger.error).toHaveBeenCalledWith({
      event: "redis_subscriber_error",
      channel: "order_events",
      error: "redis down"
    });
  });
});
