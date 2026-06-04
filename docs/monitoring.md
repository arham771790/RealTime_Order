# Observability And Monitoring

Prometheus metrics are exposed at:

```text
GET /metrics
```

Runtime JSON diagnostics are exposed at:

```text
GET /metrics/runtime
```

Example Prometheus scrape target:

```yaml
scrape_configs:
  - job_name: realtime-orders
    static_configs:
      - targets: ["backend:3000"]
```

Recommended dashboard panels:

- `realtime_orders_socket_connections` for active websocket clients.
- `rate(realtime_orders_socket_broadcasts_total[5m])` for websocket fanout rate.
- `realtime_orders_event_lag_seconds` for latest event delivery lag.
- `realtime_orders_outbox_backlog` for unpublished outbox events.
- `rate(realtime_orders_outbox_failed_total[5m])` for outbox publish retry pressure.
- `realtime_orders_email_circuit_state` for delivered-order email circuit health, where `0` is closed, `1` is half-open, and `2` is open.

Useful alerts:

- Event lag above 5 seconds for 5 minutes.
- Outbox backlog above 100 events for 10 minutes.
- Outbox failures greater than zero for 5 minutes.
- Email circuit state equal to 2 for 5 minutes.
