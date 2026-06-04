import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { OrderEventSubscriber } from "../../src/subscribers/order-event-subscriber.js";

function createLogger() {
  return {
    info: jest.fn(),
    error: jest.fn()
  };
}

function createRedisSubscriber() {
  const redisSubscriber = new EventEmitter();
  redisSubscriber.connect = jest.fn().mockResolvedValue();
  redisSubscriber.close = jest.fn().mockResolvedValue();
  return redisSubscriber;
}

function createSocketBroadcaster(overrides = {}) {
  return {
    broadcastOrderEvent: jest.fn(() => ["admin:global"]),
    ...overrides
  };
}

function createEventCoalescer() {
  return {
    clear: jest.fn(),
    enqueue: jest.fn((event, flushCallback) => flushCallback(event)),
    flushAll: jest.fn()
  };
}

const changeEvent = {
  eventId: "evt-1",
  operation: "INSERT",
  orderId: 42,
  new: {
    id: 42,
    customer_name: "Ada Lovelace",
    status: "pending"
  },
  old: null
};

describe("OrderEventSubscriber", () => {
  it("requires Redis subscriber and socket broadcaster dependencies", () => {
    expect(
      () => new OrderEventSubscriber({ socketBroadcaster: createSocketBroadcaster() })
    ).toThrow("OrderEventSubscriber requires a Redis subscriber.");
    expect(() => new OrderEventSubscriber({ redisSubscriber: createRedisSubscriber() })).toThrow(
      "OrderEventSubscriber requires a socket broadcaster."
    );
  });

  it("starts the Redis subscriber", async () => {
    const redisSubscriber = createRedisSubscriber();
    const socketBroadcaster = createSocketBroadcaster();
    const subscriber = new OrderEventSubscriber({
      eventCoalescer: createEventCoalescer(),
      redisSubscriber,
      socketBroadcaster
    });

    await subscriber.start();

    expect(redisSubscriber.connect).toHaveBeenCalledTimes(1);
    expect(subscriber.isRunning).toBe(true);
  });

  it("broadcasts Redis order events to sockets", async () => {
    const redisSubscriber = createRedisSubscriber();
    const socketBroadcaster = createSocketBroadcaster();
    const subscriber = new OrderEventSubscriber({
      eventCoalescer: createEventCoalescer(),
      redisSubscriber,
      socketBroadcaster
    });

    await subscriber.start();
    redisSubscriber.emit("event", changeEvent);

    expect(socketBroadcaster.broadcastOrderEvent).toHaveBeenCalledWith(changeEvent);
  });

  it("logs socket broadcast failures without throwing", async () => {
    const redisSubscriber = createRedisSubscriber();
    const logger = createLogger();
    const socketBroadcaster = createSocketBroadcaster({
      broadcastOrderEvent: jest.fn(() => {
        throw new Error("socket unavailable");
      })
    });
    const subscriber = new OrderEventSubscriber({
      eventCoalescer: createEventCoalescer(),
      logger,
      redisSubscriber,
      socketBroadcaster
    });

    await subscriber.start();
    redisSubscriber.emit("event", changeEvent);

    expect(logger.error).toHaveBeenCalledWith({
      event: "order_event_socket_broadcast_failed",
      eventId: "evt-1",
      error: "socket unavailable"
    });
  });

  it("stops and removes the Redis event handler", async () => {
    const redisSubscriber = createRedisSubscriber();
    const socketBroadcaster = createSocketBroadcaster();
    const eventCoalescer = createEventCoalescer();
    const subscriber = new OrderEventSubscriber({
      eventCoalescer,
      redisSubscriber,
      socketBroadcaster
    });

    await subscriber.start();
    await subscriber.stop();
    redisSubscriber.emit("event", changeEvent);

    expect(redisSubscriber.close).toHaveBeenCalledTimes(1);
    expect(eventCoalescer.flushAll).toHaveBeenCalledTimes(1);
    expect(eventCoalescer.clear).toHaveBeenCalledTimes(1);
    expect(socketBroadcaster.broadcastOrderEvent).not.toHaveBeenCalled();
  });

  it("coalesces Redis order events before broadcasting", async () => {
    const redisSubscriber = createRedisSubscriber();
    const eventCoalescer = createEventCoalescer();
    const socketBroadcaster = createSocketBroadcaster();
    const subscriber = new OrderEventSubscriber({
      eventCoalescer,
      redisSubscriber,
      socketBroadcaster
    });

    await subscriber.start();
    redisSubscriber.emit("event", changeEvent);

    expect(eventCoalescer.enqueue).toHaveBeenCalledWith(changeEvent, expect.any(Function));
  });
});
