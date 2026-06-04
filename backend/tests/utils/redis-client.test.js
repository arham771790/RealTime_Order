import { jest } from "@jest/globals";

import { createRedisClient, createRedisReconnectStrategy } from "../../src/utils/redis-client.js";

function createLogger() {
  return {
    warn: jest.fn()
  };
}

describe("createRedisReconnectStrategy", () => {
  it("caps reconnect delays", () => {
    const logger = createLogger();
    const reconnectStrategy = createRedisReconnectStrategy({
      reconnectDelayMs: 100,
      maxReconnectDelayMs: 250,
      logger
    });

    expect(reconnectStrategy(1)).toBe(100);
    expect(reconnectStrategy(3)).toBe(250);
    expect(logger.warn).toHaveBeenCalledWith({
      event: "redis_reconnect_scheduled",
      retries: 3,
      delayMs: 250
    });
  });
});

describe("createRedisClient", () => {
  it("creates a redis client with url and reconnect strategy", () => {
    const createClientFn = jest.fn((options) => ({ options }));

    const client = createRedisClient({
      url: "redis://localhost:6379",
      reconnectDelayMs: 100,
      maxReconnectDelayMs: 1000,
      logger: createLogger(),
      createClientFn
    });

    expect(createClientFn).toHaveBeenCalledWith({
      url: "redis://localhost:6379",
      socket: {
        reconnectStrategy: expect.any(Function)
      }
    });
    expect(client.options.socket.reconnectStrategy(2)).toBe(200);
  });
});
