# Real-Time Orders System

Production-grade realtime order update platform using Node.js 22, Express, Socket.IO, PostgreSQL, Redis Pub/Sub, PostgreSQL `LISTEN/NOTIFY`, and the transactional outbox pattern.

The system delivers order create/update/delete events to browser clients without polling. It includes a React dashboard, a static Socket.IO demo page, Docker Compose support, SMTP delivered-order notifications, horizontal websocket scaling, and Prometheus observability.

# LIVE LINK : https://real-time-order-kappa.vercel.app/ 
 DEMO VIDEO : https://www.loom.com/share/9383df1e303f4063906e87adcf80b638

## Architecture

```text
PostgreSQL orders table
  -> trigger notify_order_change()
  -> LISTEN order_changes
  -> DBChangeListener
  -> OrderChangePipeline
  -> RedisPublisher
  -> Redis Pub/Sub channel
  -> RedisSubscriber
  -> OrderEventSubscriber
  -> 100ms EventCoalescer
  -> SocketBroadcaster
  -> Socket.IO rooms
  -> Browser clients

Parallel reliability path:
OrdersRepository transaction
  -> orders mutation
  -> outbox_events insert
  -> OutboxProcessor every 5s
  -> RedisPublisher
  -> same Redis/Subscribers/Sockets path
```

Supported Socket.IO rooms:

- `admin:global`
- `order:{id}`
- `customer:{name}`
- `status:{status}`

## Folder Structure

```text
.
├── docker/
│   └── frontend.Dockerfile
├── docs/
│   ├── client-deduplication.md
│   ├── monitoring.md
│   └── scaling.md
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── layouts/
│       ├── pages/
│       ├── store/
│       └── utils/
├── migrations/
├── public/
├── src/
│   ├── api/
│   ├── config/
│   ├── db/
│   ├── listeners/
│   ├── metrics/
│   ├── middleware/
│   ├── notifications/
│   ├── outbox/
│   ├── publishers/
│   ├── repositories/
│   ├── services/
│   ├── sockets/
│   ├── subscribers/
│   └── utils/
└── tests/
```

## Quick Start

Prerequisites:

- Node.js 22
- npm
- Docker and Docker Compose for the full stack

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Copy environment files:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
```

## Docker Demo

Run the full system:

```bash
docker compose up --build
```

Demo URLs:

- Backend API: `http://localhost:3000`
- React dashboard: `http://localhost:5173`
- Static Socket.IO demo: `http://localhost:3000/demo.html`
- Mailpit email inbox: `http://localhost:8025`
- Prometheus metrics: `http://localhost:3000/metrics`

PostgreSQL migrations run from `migrations/` when the `postgres_data` volume is first created. To reset the database:

```bash
docker compose down -v
docker compose up --build
```

## API Docs

Health and metrics:

- `GET /health` returns `{ "status": "ok" }`
- `GET /ready` returns `{ "status": "ready" }`
- `GET /metrics` returns Prometheus text metrics
- `GET /metrics/runtime` returns JSON process diagnostics

Orders:

- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `PATCH /api/orders/:id/status`
- `DELETE /api/orders/:id`

Create order body:

```json
{
  "customerName": "Ada Lovelace",
  "productName": "Mechanical Keyboard",
  "status": "pending"
}
```

Update status body:

```json
{
  "status": "delivered"
}
```

Supported statuses:

- `pending`
- `shipped`
- `delivered`

Successful order responses return `{ "data": ... }`. Errors return `{ "error": { "message": "...", "code": "..." } }`.

## WebSocket Docs

Socket.IO connects to the backend origin, usually `http://localhost:3000`.

Server events:

- `connection:ready` confirms socket setup
- `subscription:updated` returns active rooms
- `order:event` delivers realtime order changes

Client events:

- `subscribe` with `{ "room": "admin:global" }`
- `unsubscribe` with `{ "room": "order:42" }`

Order event payloads include:

- `eventId`
- `eventType`
- `operation`
- `table`
- `occurredAt`
- `orderId`
- `old`
- `new`

## Frontend

The React dashboard demonstrates realtime behavior rather than full ecommerce workflows.

Features:

- Live order summary cards
- Searchable/filterable orders table
- Realtime row highlighting
- Live event feed capped at 100 events
- Room subscription panel
- Connection status and latency widget
- Order detail modal with live updates
- Demo controls for create/update/delete
- Dark mode and responsive layout

Run locally:

```bash
cd frontend
npm run dev
```

## Reliability

`LISTEN/NOTIFY` provides low-latency fanout from PostgreSQL. The transactional outbox provides a durable parallel path by inserting `outbox_events` in the same database transaction as order mutations.

The outbox processor:

- Polls every `OUTBOX_POLL_INTERVAL_MS`
- Processes up to `OUTBOX_BATCH_SIZE`
- Publishes to Redis
- Marks successful events with `published_at`
- Increments `retry_count` and stores `last_error` on failure

Browser deduplication uses bounded `eventId` memory to drop duplicate deliveries.

## Scaling Strategy

Enable Socket.IO horizontal scaling with:

```env
SOCKET_REDIS_ADAPTER_ENABLED=true
```

All backend instances should share Redis. The Socket.IO Redis adapter fans out room broadcasts across instances.

Use sticky sessions at the load balancer for websocket upgrades. See [docs/scaling.md](docs/scaling.md).

## Observability

Prometheus metrics are available at `/metrics`.

Important metrics:

- `realtime_orders_socket_connections`
- `realtime_orders_socket_broadcasts_total`
- `realtime_orders_event_lag_seconds`
- `realtime_orders_outbox_backlog`
- `realtime_orders_outbox_published_total`
- `realtime_orders_outbox_failed_total`
- `realtime_orders_email_circuit_state`

See [docs/monitoring.md](docs/monitoring.md) for dashboard and alert ideas.

## Email Notifications

When an order reaches `delivered`, the service sends an SMTP notification if `EMAIL_ENABLED=true`.

Email delivery has:

- Retry attempts
- Circuit breaker protection
- Failure isolation so order updates still succeed
- Mailpit support in Docker Compose

## Environment

Core variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_CHANNEL`
- `SOCKET_CORS_ORIGIN`
- `SOCKET_REDIS_ADAPTER_ENABLED`
- `OUTBOX_POLL_INTERVAL_MS`
- `OUTBOX_BATCH_SIZE`
- `OUTBOX_MAX_RETRIES`
- `EMAIL_ENABLED`
- `SMTP_HOST`
- `SMTP_PORT`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`

See [.env.example](.env.example) for the full list.

## Scripts

Backend:

- `npm run dev`
- `npm run start`
- `npm run test`
- `npm run lint`
- `npm run format`
- `npm run format:check`

Frontend:

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Failure Scenarios

- PostgreSQL temporarily unavailable: startup retries database connection before serving traffic.
- Redis unavailable: publishers/subscribers use Redis reconnect strategy and log failures.
- Outbox publish fails: event stays unpublished with incremented retry metadata.
- Duplicate event delivery: client store deduplicates by `eventId`.
- SMTP outage: retry and circuit breaker isolate failures from order updates.
- Backend instance shutdown: graceful shutdown stops outbox, Redis subscriber, DB listener pipeline, HTTP server, and PostgreSQL pool.

## Tradeoffs

- `LISTEN/NOTIFY` gives fast delivery but is not durable, so the outbox exists as the reliable path.
- The outbox processor uses polling for simplicity and operational predictability.
- Event coalescing reduces burst noise but intentionally delays websocket broadcasts by up to 100ms.
- The demo frontend uses Vite dev serving in Docker for interview visibility rather than an Nginx production image.
- `customer:{name}` rooms are convenient for demos but real systems should prefer stable customer ids.

## Future Improvements

- Replace polling outbox with advisory-lock workers for stronger multi-worker coordination.
- Add database migration tooling with applied-migration tracking.
- Add OpenAPI generation.
- Add end-to-end browser tests for the Docker demo flow.
- Add customer ids and customer email addresses to support customer-specific notifications.
- Add Grafana dashboard JSON exports.
