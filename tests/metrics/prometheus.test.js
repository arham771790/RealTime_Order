import {
  getPrometheusMetrics,
  observeOrderEventLag,
  recordOutboxFailed,
  recordOutboxPublished,
  recordSocketBroadcast,
  resetPrometheusMetricsForTests,
  setEmailCircuitBreakerState,
  setOutboxBacklog,
  setSocketConnectionCount
} from "../../src/metrics/prometheus.js";

describe("Prometheus metrics", () => {
  beforeEach(() => {
    resetPrometheusMetricsForTests();
  });

  it("records realtime platform metrics", async () => {
    setSocketConnectionCount(3);
    recordSocketBroadcast();
    observeOrderEventLag({ occurredAt: "2026-06-04T12:00:00.000Z" }, 1780574405000);
    setOutboxBacklog(9);
    recordOutboxPublished();
    recordOutboxFailed();
    setEmailCircuitBreakerState("open");

    const metrics = await getPrometheusMetrics();

    expect(metrics).toContain("realtime_orders_socket_connections 3");
    expect(metrics).toContain("realtime_orders_socket_broadcasts_total 1");
    expect(metrics).toContain("realtime_orders_event_lag_seconds 5");
    expect(metrics).toContain("realtime_orders_outbox_backlog 9");
    expect(metrics).toContain("realtime_orders_outbox_published_total 1");
    expect(metrics).toContain("realtime_orders_outbox_failed_total 1");
    expect(metrics).toContain("realtime_orders_email_circuit_state 2");
  });
});
