import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { RedisPublisher } from "../../src/publishers/redis-publisher.js";

class FakeRedisClient extends EventEmitter {
  constructor() {
    super();
    this.connect = jest.fn().mockResolvedValue();
    this.publish = jest.fn().mockResolvedValue(2);
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

describe("RedisPublisher", () => {
  it("connects and publishes JSON events", async () => {
    const client = new FakeRedisClient();
    const logger = createLogger();
    const publisher = new RedisPublisher({ client, channel: "order_events", logger });

    const receiverCount = await publisher.publish({ eventId: "evt-1", operation: "INSERT" });

    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(client.publish).toHaveBeenCalledWith(
      "order_events",
      JSON.stringify({ eventId: "evt-1", operation: "INSERT" })
    );
    expect(receiverCount).toBe(2);
    expect(logger.info).toHaveBeenCalledWith({
      event: "redis_event_published",
      channel: "order_events",
      receiverCount: 2
    });
  });

  it("does not reconnect when already connected", async () => {
    const client = new FakeRedisClient();
    const publisher = new RedisPublisher({ client });

    await publisher.connect();
    await publisher.connect();

    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it("checks redis health with ping", async () => {
    const publisher = new RedisPublisher({ client: new FakeRedisClient() });

    await expect(publisher.healthCheck()).resolves.toBe(true);
  });

  it("closes the redis client", async () => {
    const client = new FakeRedisClient();
    const publisher = new RedisPublisher({ client });

    await publisher.connect();
    await publisher.close();

    expect(client.quit).toHaveBeenCalledTimes(1);
  });

  it("logs client errors", async () => {
    const client = new FakeRedisClient();
    const logger = createLogger();
    const publisher = new RedisPublisher({ client, channel: "order_events", logger });

    await publisher.connect();
    client.emit("error", new Error("redis down"));

    expect(logger.error).toHaveBeenCalledWith({
      event: "redis_publisher_error",
      channel: "order_events",
      error: "redis down"
    });
  });
});
