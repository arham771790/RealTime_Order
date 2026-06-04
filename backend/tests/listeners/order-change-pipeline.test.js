import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { OrderChangePipeline } from "../../src/listeners/order-change-pipeline.js";

function createLogger() {
  return {
    info: jest.fn(),
    error: jest.fn()
  };
}

function createDbChangeListener() {
  const listener = new EventEmitter();
  listener.start = jest.fn().mockResolvedValue();
  listener.stop = jest.fn().mockResolvedValue();
  return listener;
}

function createRedisPublisher(overrides = {}) {
  return {
    connect: jest.fn().mockResolvedValue(),
    publish: jest.fn().mockResolvedValue(1),
    close: jest.fn().mockResolvedValue(),
    ...overrides
  };
}

const changeEvent = {
  eventId: "evt-1",
  operation: "INSERT",
  orderId: 42,
  new: {
    id: 42,
    customer_name: "Ada Lovelace",
    product_name: "Mechanical Keyboard",
    status: "pending"
  },
  old: null
};

describe("OrderChangePipeline", () => {
  it("requires a database listener and Redis publisher", () => {
    expect(() => new OrderChangePipeline({ redisPublisher: createRedisPublisher() })).toThrow(
      "OrderChangePipeline requires a database change listener."
    );
    expect(() => new OrderChangePipeline({ dbChangeListener: createDbChangeListener() })).toThrow(
      "OrderChangePipeline requires a Redis publisher."
    );
  });

  it("starts Redis and the database listener", async () => {
    const dbChangeListener = createDbChangeListener();
    const redisPublisher = createRedisPublisher();
    const pipeline = new OrderChangePipeline({ dbChangeListener, redisPublisher });

    await pipeline.start();

    expect(redisPublisher.connect).toHaveBeenCalledTimes(1);
    expect(dbChangeListener.start).toHaveBeenCalledTimes(1);
  });

  it("publishes database change events to Redis", async () => {
    const dbChangeListener = createDbChangeListener();
    const redisPublisher = createRedisPublisher();
    const pipeline = new OrderChangePipeline({ dbChangeListener, redisPublisher });
    const publishedHandler = jest.fn();

    pipeline.on("published", publishedHandler);
    await pipeline.start();
    dbChangeListener.emit("change", changeEvent);
    await pipeline.waitForIdle();

    expect(redisPublisher.publish).toHaveBeenCalledWith(changeEvent);
    expect(publishedHandler).toHaveBeenCalledWith(changeEvent);
  });

  it("logs publish failures without stopping the pipeline", async () => {
    const dbChangeListener = createDbChangeListener();
    const logger = createLogger();
    const error = new Error("redis unavailable");
    const redisPublisher = createRedisPublisher({
      publish: jest.fn().mockRejectedValue(error)
    });
    const pipeline = new OrderChangePipeline({ dbChangeListener, redisPublisher, logger });
    const publishErrorHandler = jest.fn();

    pipeline.on("publish_error", publishErrorHandler);
    await pipeline.start();
    dbChangeListener.emit("change", changeEvent);
    await pipeline.waitForIdle();

    expect(publishErrorHandler).toHaveBeenCalledWith({ error, changeEvent });
    expect(logger.error).toHaveBeenCalledWith({
      event: "order_change_publish_failed",
      eventId: "evt-1",
      operation: "INSERT",
      error: "redis unavailable"
    });
    expect(pipeline.isRunning).toBe(true);
  });

  it("stops listeners and publisher cleanly", async () => {
    const dbChangeListener = createDbChangeListener();
    const redisPublisher = createRedisPublisher();
    const pipeline = new OrderChangePipeline({ dbChangeListener, redisPublisher });

    await pipeline.start();
    await pipeline.stop();
    dbChangeListener.emit("change", changeEvent);
    await pipeline.waitForIdle();

    expect(dbChangeListener.stop).toHaveBeenCalledTimes(1);
    expect(redisPublisher.close).toHaveBeenCalledTimes(1);
    expect(redisPublisher.publish).not.toHaveBeenCalled();
  });
});
