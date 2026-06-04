import { createClient } from "redis";

import env from "../config/env.js";

export function createRedisReconnectStrategy({
  reconnectDelayMs = env.redis.reconnectDelayMs,
  maxReconnectDelayMs = env.redis.maxReconnectDelayMs,
  logger = console
} = {}) {
  return function reconnectStrategy(retries) {
    const delayMs = Math.min(reconnectDelayMs * Math.max(retries, 1), maxReconnectDelayMs);

    logger.warn?.({
      event: "redis_reconnect_scheduled",
      retries,
      delayMs
    });

    return delayMs;
  };
}

export function createRedisClient({
  url = env.redis.url,
  reconnectDelayMs = env.redis.reconnectDelayMs,
  maxReconnectDelayMs = env.redis.maxReconnectDelayMs,
  logger = console,
  createClientFn = createClient
} = {}) {
  return createClientFn({
    url,
    socket: {
      reconnectStrategy: createRedisReconnectStrategy({
        reconnectDelayMs,
        maxReconnectDelayMs,
        logger
      })
    }
  });
}
