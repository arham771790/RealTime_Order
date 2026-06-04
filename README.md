# Real-Time Orders System

Production-grade real-time order update platform built incrementally with professional-style commits. The backend will use Node.js, Express, PostgreSQL, Socket.IO, Redis Pub/Sub, PostgreSQL `LISTEN/NOTIFY`, and the transactional outbox pattern to deliver instant order updates without polling.

## Current Status

Commit 9 adds canonical websocket room management for global, order, customer, and status subscriptions. Database change listeners, Redis fanout, and the frontend dashboard arrive in later commits.

## Backend Interfaces

### OrdersRepository

The orders repository owns SQL access for the `orders` table and maps database rows into application objects.

- `createOrder({ customerName, productName, status })`
- `getOrder(id)`
- `getOrders({ customerName, status, limit, offset })`
- `updateOrder(id, { status })`
- `deleteOrder(id)`

### OrdersService

The orders service owns business validation and not-found behavior before delegating persistence to the repository.

- `createOrder({ customerName, productName, status })`
- `getOrder(id)`
- `getOrders({ customerName, status, limit, offset })`
- `updateOrderStatus(id, status)`
- `deleteOrder(id)`

Supported order statuses:

- `pending`
- `shipped`
- `delivered`

## REST API

- `GET /health` returns `{ "status": "ok" }`
- `GET /api/orders` lists orders and supports `customerName`, `status`, `limit`, and `offset`
- `GET /api/orders/:id` returns one order
- `POST /api/orders` creates an order
- `PATCH /api/orders/:id/status` updates only the order status
- `DELETE /api/orders/:id` deletes an order and returns `204 No Content`

Successful order endpoints return `{ "data": ... }`. Errors return `{ "error": { "message": "...", "code": "..." } }`.

## WebSocket API

Socket.IO is attached to the same backend HTTP server.

- `connection:ready` is emitted after a client connects
- `subscribe` joins a room and acknowledges with `{ ok, room, rooms }`
- `unsubscribe` leaves a room and acknowledges with `{ ok, room, rooms }`
- `subscription:updated` is emitted after room membership changes

Supported rooms:

- `admin:global`
- `order:{id}`
- `customer:{name}`
- `status:{status}`

## Target Architecture

```text
Postgres
  -> LISTEN / NOTIFY
  -> DBChangeListener
  -> EventPublisher
  -> Redis Pub/Sub
  -> RedisSubscriber
  -> SocketManager
  -> Browser Clients

Parallel path:
Outbox Table
  -> Outbox Processor
  -> Redis Pub/Sub
```

## Planned Delivery Roadmap

### Backend

1. `chore: initialize project structure`
2. `feat: create express server and health endpoint`
3. `feat: postgres database layer`
4. `feat: create orders schema and migrations`
5. `feat: implement orders repository`
6. `feat: implement orders service layer`
7. `feat: implement orders REST API`
8. `feat: implement socket.io infrastructure`
9. `feat: implement room manager`
10. `feat: implement postgres LISTEN/NOTIFY listener`
11. `feat: add database triggers for change notifications`
12. `feat: implement redis pubsub layer`
13. `feat: integrate db listener with redis publisher`
14. `feat: implement websocket event broadcasting`
15. `feat: implement transactional outbox pattern`
16. `feat: implement outbox processor`
17. `feat: implement event coalescing`
18. `feat: implement client side dedup support`
19. `feat: add browser demo client`
20. `feat: add delivered-order email notifications`
21. `feat: dockerize application`
22. `feat: production hardening`
23. `feat: socket.io redis adapter for horizontal scaling`
24. `feat: observability and monitoring`
25. `docs: finalize documentation`

### Frontend

The React dashboard work starts after backend Commit 14.

1. `feat(frontend): initialize react dashboard`
2. `feat(frontend): create dashboard layout`
3. `feat(frontend): implement orders table`
4. `feat(frontend): implement socket connection manager`
5. `feat(frontend): implement live event feed`
6. `feat(frontend): implement room subscriptions`
7. `feat(frontend): implement order detail modal`
8. `feat(frontend): implement demo controls`
9. `feat(frontend): add realtime row highlighting`
10. `feat(frontend): production polish and responsive UI`

## Folder Structure

```text
src/
├── api/
├── config/
├── db/
├── listeners/
├── metrics/
├── middleware/
├── notifications/
├── outbox/
├── publishers/
├── repositories/
├── services/
├── sockets/
├── subscribers/
└── utils/
tests/
docker/
migrations/
docs/
```

## Database Schema

Migration files live in `migrations/` and are intended to run in filename order.

- `001_create_orders_table.sql` creates `orders` with status values `pending`, `shipped`, and `delivered`.
- `002_create_outbox_table.sql` creates `outbox_events` for the transactional outbox pattern.
- `003_add_orders_updated_at_trigger.sql` keeps `orders.updated_at` current on updates.

## Getting Started

### Prerequisites

- Node.js 22
- npm 11+

### Install Dependencies

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and adjust values as needed.

```bash
cp .env.example .env
```

Current environment variables:

- `NODE_ENV` with supported values: `development`, `test`, `production`
- `PORT` for the backend HTTP server
- `DATABASE_URL` for the PostgreSQL connection string
- `DATABASE_POOL_MAX` for the maximum PostgreSQL pool size
- `DATABASE_CONNECTION_TIMEOUT_MS` for opening new database connections
- `DATABASE_IDLE_TIMEOUT_MS` for idle pooled connections
- `DATABASE_RETRY_ATTEMPTS` for startup database connection checks
- `DATABASE_RETRY_DELAY_MS` between startup database connection attempts
- `DATABASE_SSL` to enable PostgreSQL SSL config
- `SOCKET_CORS_ORIGIN` for browser websocket origins
- `SOCKET_PING_INTERVAL_MS` for Socket.IO heartbeat interval
- `SOCKET_PING_TIMEOUT_MS` for Socket.IO heartbeat timeout

## Available Scripts

- `npm run dev`
- `npm run lint`
- `npm run lint:fix`
- `npm run start`
- `npm run test`
- `npm run format`
- `npm run format:check`

## Notes

- The backend is plain JavaScript using ESM modules.
- The backend starts with `npm run dev` for local development or `npm run start` for a standard process launch.
- Server startup verifies PostgreSQL connectivity before listening for HTTP requests.
- `GET /health` returns `{ "status": "ok" }` and is used as the first operational endpoint.
- Request logging and centralized error middleware are in place so future routes inherit the same behavior.
