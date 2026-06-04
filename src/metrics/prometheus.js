import client from "prom-client";

export const prometheusRegistry = new client.Registry();

client.collectDefaultMetrics({
  prefix: "realtime_orders_",
  register: prometheusRegistry
});

const socketConnectionsGauge = new client.Gauge({
  name: "realtime_orders_socket_connections",
  help: "Current number of connected Socket.IO clients.",
  registers: [prometheusRegistry]
});

const socketBroadcastsCounter = new client.Counter({
  name: "realtime_orders_socket_broadcasts_total",
  help: "Total Socket.IO order event broadcasts.",
  registers: [prometheusRegistry]
});

const orderEventLagGauge = new client.Gauge({
  name: "realtime_orders_event_lag_seconds",
  help: "Lag in seconds between order event occurrence and websocket broadcast.",
  registers: [prometheusRegistry]
});

const outboxBacklogGauge = new client.Gauge({
  name: "realtime_orders_outbox_backlog",
  help: "Number of unpublished outbox events waiting for processing.",
  registers: [prometheusRegistry]
});

const outboxPublishedCounter = new client.Counter({
  name: "realtime_orders_outbox_published_total",
  help: "Total outbox events successfully published to Redis.",
  registers: [prometheusRegistry]
});

const outboxFailedCounter = new client.Counter({
  name: "realtime_orders_outbox_failed_total",
  help: "Total outbox event publish failures recorded for retry.",
  registers: [prometheusRegistry]
});

const emailCircuitStateGauge = new client.Gauge({
  name: "realtime_orders_email_circuit_state",
  help: "Delivered-order email circuit breaker state: 0 closed, 1 half-open, 2 open.",
  registers: [prometheusRegistry]
});

const circuitStateValues = {
  closed: 0,
  half_open: 1,
  open: 2
};

export function setSocketConnectionCount(count) {
  socketConnectionsGauge.set(count);
}

export function recordSocketBroadcast(count = 1) {
  socketBroadcastsCounter.inc(count);
}

export function observeOrderEventLag(event, now = Date.now()) {
  const occurredAt = event.occurredAt ?? event.createdAt;

  if (!occurredAt) {
    return;
  }

  const occurredAtMs = new Date(occurredAt).getTime();

  if (Number.isFinite(occurredAtMs)) {
    orderEventLagGauge.set(Math.max(0, (now - occurredAtMs) / 1000));
  }
}

export function setOutboxBacklog(count) {
  outboxBacklogGauge.set(count);
}

export function recordOutboxPublished(count = 1) {
  outboxPublishedCounter.inc(count);
}

export function recordOutboxFailed(count = 1) {
  outboxFailedCounter.inc(count);
}

export function setEmailCircuitBreakerState(state) {
  emailCircuitStateGauge.set(circuitStateValues[state] ?? 0);
}

export async function getPrometheusMetrics() {
  return prometheusRegistry.metrics();
}

export function getPrometheusContentType() {
  return prometheusRegistry.contentType;
}

export function resetPrometheusMetricsForTests() {
  prometheusRegistry.resetMetrics();
}
