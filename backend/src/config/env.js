import dotenv from "dotenv";

const VALID_NODE_ENVS = new Set(["development", "test", "production"]);
const DEFAULT_NODE_ENV = "development";
const DEFAULT_PORT = 3000;
const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/realtime_orders";
const DEFAULT_DATABASE_POOL_MAX = 10;
const DEFAULT_DATABASE_CONNECTION_TIMEOUT_MS = 5000;
const DEFAULT_DATABASE_IDLE_TIMEOUT_MS = 30000;
const DEFAULT_DATABASE_RETRY_ATTEMPTS = 5;
const DEFAULT_DATABASE_RETRY_DELAY_MS = 1000;
const DEFAULT_SOCKET_CORS_ORIGIN = "http://localhost:5173";
const DEFAULT_SOCKET_PING_INTERVAL_MS = 25000;
const DEFAULT_SOCKET_PING_TIMEOUT_MS = 20000;
const DEFAULT_REDIS_URL = "redis://localhost:6379";
const DEFAULT_REDIS_CHANNEL = "order_events";
const DEFAULT_REDIS_RECONNECT_DELAY_MS = 1000;
const DEFAULT_REDIS_MAX_RECONNECT_DELAY_MS = 30000;
const DEFAULT_OUTBOX_POLL_INTERVAL_MS = 5000;
const DEFAULT_OUTBOX_BATCH_SIZE = 50;
const DEFAULT_OUTBOX_MAX_RETRIES = 5;
const DEFAULT_EMAIL_ENABLED = false;
const DEFAULT_SMTP_HOST = "localhost";
const DEFAULT_SMTP_PORT = 1025;
const DEFAULT_SMTP_SECURE = false;
const DEFAULT_EMAIL_FROM = "orders@example.com";
const DEFAULT_DELIVERED_ORDER_NOTIFICATION_TO = "ops@example.com";
const DEFAULT_EMAIL_RETRY_ATTEMPTS = 3;
const DEFAULT_EMAIL_RETRY_DELAY_MS = 250;
const DEFAULT_EMAIL_CIRCUIT_FAILURE_THRESHOLD = 3;
const DEFAULT_EMAIL_CIRCUIT_RESET_TIMEOUT_MS = 30000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_RATE_LIMIT_MAX = 300;

dotenv.config();

function parseNodeEnv(rawNodeEnv) {
  const nodeEnv = rawNodeEnv ?? DEFAULT_NODE_ENV;

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${nodeEnv}". Expected one of: ${Array.from(VALID_NODE_ENVS).join(", ")}.`
    );
  }

  return nodeEnv;
}

function parsePort(rawPort) {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT "${rawPort}". PORT must be a positive integer.`);
  }

  return port;
}

function parsePositiveInteger(name, rawValue, defaultValue) {
  if (rawValue === undefined) {
    return defaultValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${name} "${rawValue}". ${name} must be a positive integer.`);
  }

  return parsedValue;
}

function parseBoolean(name, rawValue, defaultValue) {
  if (rawValue === undefined) {
    return defaultValue;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  throw new Error(`Invalid ${name} "${rawValue}". ${name} must be either "true" or "false".`);
}

export const env = Object.freeze({
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  port: parsePort(process.env.PORT),
  database: Object.freeze({
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    poolMax: parsePositiveInteger(
      "DATABASE_POOL_MAX",
      process.env.DATABASE_POOL_MAX,
      DEFAULT_DATABASE_POOL_MAX
    ),
    connectionTimeoutMs: parsePositiveInteger(
      "DATABASE_CONNECTION_TIMEOUT_MS",
      process.env.DATABASE_CONNECTION_TIMEOUT_MS,
      DEFAULT_DATABASE_CONNECTION_TIMEOUT_MS
    ),
    idleTimeoutMs: parsePositiveInteger(
      "DATABASE_IDLE_TIMEOUT_MS",
      process.env.DATABASE_IDLE_TIMEOUT_MS,
      DEFAULT_DATABASE_IDLE_TIMEOUT_MS
    ),
    retryAttempts: parsePositiveInteger(
      "DATABASE_RETRY_ATTEMPTS",
      process.env.DATABASE_RETRY_ATTEMPTS,
      DEFAULT_DATABASE_RETRY_ATTEMPTS
    ),
    retryDelayMs: parsePositiveInteger(
      "DATABASE_RETRY_DELAY_MS",
      process.env.DATABASE_RETRY_DELAY_MS,
      DEFAULT_DATABASE_RETRY_DELAY_MS
    ),
    ssl: parseBoolean("DATABASE_SSL", process.env.DATABASE_SSL, false)
  }),
  socket: Object.freeze({
    corsOrigin: (process.env.SOCKET_CORS_ORIGIN ?? DEFAULT_SOCKET_CORS_ORIGIN)
      .split(",")
      .map(s => s.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    pingIntervalMs: parsePositiveInteger(
      "SOCKET_PING_INTERVAL_MS",
      process.env.SOCKET_PING_INTERVAL_MS,
      DEFAULT_SOCKET_PING_INTERVAL_MS
    ),
    pingTimeoutMs: parsePositiveInteger(
      "SOCKET_PING_TIMEOUT_MS",
      process.env.SOCKET_PING_TIMEOUT_MS,
      DEFAULT_SOCKET_PING_TIMEOUT_MS
    ),
    redisAdapterEnabled: parseBoolean(
      "SOCKET_REDIS_ADAPTER_ENABLED",
      process.env.SOCKET_REDIS_ADAPTER_ENABLED,
      false
    )
  }),
  redis: Object.freeze({
    url: process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
    channel: process.env.REDIS_CHANNEL ?? DEFAULT_REDIS_CHANNEL,
    reconnectDelayMs: parsePositiveInteger(
      "REDIS_RECONNECT_DELAY_MS",
      process.env.REDIS_RECONNECT_DELAY_MS,
      DEFAULT_REDIS_RECONNECT_DELAY_MS
    ),
    maxReconnectDelayMs: parsePositiveInteger(
      "REDIS_MAX_RECONNECT_DELAY_MS",
      process.env.REDIS_MAX_RECONNECT_DELAY_MS,
      DEFAULT_REDIS_MAX_RECONNECT_DELAY_MS
    )
  }),
  outbox: Object.freeze({
    pollIntervalMs: parsePositiveInteger(
      "OUTBOX_POLL_INTERVAL_MS",
      process.env.OUTBOX_POLL_INTERVAL_MS,
      DEFAULT_OUTBOX_POLL_INTERVAL_MS
    ),
    batchSize: parsePositiveInteger(
      "OUTBOX_BATCH_SIZE",
      process.env.OUTBOX_BATCH_SIZE,
      DEFAULT_OUTBOX_BATCH_SIZE
    ),
    maxRetries: parsePositiveInteger(
      "OUTBOX_MAX_RETRIES",
      process.env.OUTBOX_MAX_RETRIES,
      DEFAULT_OUTBOX_MAX_RETRIES
    )
  }),
  email: Object.freeze({
    enabled: parseBoolean("EMAIL_ENABLED", process.env.EMAIL_ENABLED, DEFAULT_EMAIL_ENABLED),
    from: process.env.EMAIL_FROM ?? DEFAULT_EMAIL_FROM,
    deliveredOrderNotificationTo:
      process.env.DELIVERED_ORDER_NOTIFICATION_TO ?? DEFAULT_DELIVERED_ORDER_NOTIFICATION_TO,
    retryAttempts: parsePositiveInteger(
      "EMAIL_RETRY_ATTEMPTS",
      process.env.EMAIL_RETRY_ATTEMPTS,
      DEFAULT_EMAIL_RETRY_ATTEMPTS
    ),
    retryDelayMs: parsePositiveInteger(
      "EMAIL_RETRY_DELAY_MS",
      process.env.EMAIL_RETRY_DELAY_MS,
      DEFAULT_EMAIL_RETRY_DELAY_MS
    ),
    circuitFailureThreshold: parsePositiveInteger(
      "EMAIL_CIRCUIT_FAILURE_THRESHOLD",
      process.env.EMAIL_CIRCUIT_FAILURE_THRESHOLD,
      DEFAULT_EMAIL_CIRCUIT_FAILURE_THRESHOLD
    ),
    circuitResetTimeoutMs: parsePositiveInteger(
      "EMAIL_CIRCUIT_RESET_TIMEOUT_MS",
      process.env.EMAIL_CIRCUIT_RESET_TIMEOUT_MS,
      DEFAULT_EMAIL_CIRCUIT_RESET_TIMEOUT_MS
    ),
    smtp: Object.freeze({
      host: process.env.SMTP_HOST ?? DEFAULT_SMTP_HOST,
      port: parsePositiveInteger("SMTP_PORT", process.env.SMTP_PORT, DEFAULT_SMTP_PORT),
      secure: parseBoolean("SMTP_SECURE", process.env.SMTP_SECURE, DEFAULT_SMTP_SECURE),
      user: process.env.SMTP_USER || undefined,
      password: process.env.SMTP_PASSWORD || undefined
    })
  }),
  security: Object.freeze({
    rateLimitWindowMs: parsePositiveInteger(
      "RATE_LIMIT_WINDOW_MS",
      process.env.RATE_LIMIT_WINDOW_MS,
      DEFAULT_RATE_LIMIT_WINDOW_MS
    ),
    rateLimitMax: parsePositiveInteger(
      "RATE_LIMIT_MAX",
      process.env.RATE_LIMIT_MAX,
      DEFAULT_RATE_LIMIT_MAX
    )
  })
});

export default env;
