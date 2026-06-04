import { jest } from "@jest/globals";

import { OutboxRepository } from "../../src/outbox/outbox.repository.js";

const outboxRow = {
  id: "8a7d5c4e-f73d-4a2b-a6f7-56efed38b7d3",
  aggregate_type: "order",
  aggregate_id: "42",
  event_type: "order.created",
  payload: { orderId: 42 },
  retry_count: 0,
  last_error: null,
  created_at: "2026-06-04T12:00:00.000Z",
  published_at: null
};

function createPool(rows = [outboxRow]) {
  return {
    query: jest.fn().mockResolvedValue({ rows })
  };
}

function createRepository(pool = createPool()) {
  return new OutboxRepository({ pool });
}

describe("OutboxRepository", () => {
  it("requires a PostgreSQL pool", () => {
    expect(() => new OutboxRepository({})).toThrow("OutboxRepository requires a PostgreSQL pool.");
  });

  it("creates an outbox event", async () => {
    const pool = createPool();
    const repository = createRepository(pool);

    const event = await repository.createEvent({
      aggregateType: "order",
      aggregateId: "42",
      eventType: "order.created",
      payload: { orderId: 42 }
    });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO outbox_events"), [
      "order",
      "42",
      "order.created",
      JSON.stringify({ orderId: 42 })
    ]);
    expect(event).toEqual({
      id: "8a7d5c4e-f73d-4a2b-a6f7-56efed38b7d3",
      aggregateType: "order",
      aggregateId: "42",
      eventType: "order.created",
      payload: { orderId: 42 },
      retryCount: 0,
      lastError: null,
      createdAt: "2026-06-04T12:00:00.000Z",
      publishedAt: null
    });
  });

  it("finds unpublished events under the retry limit", async () => {
    const pool = createPool();
    const repository = createRepository(pool);

    const events = await repository.getUnpublishedEvents({ limit: 25, maxRetries: 3 });
    const [query, values] = pool.query.mock.calls[0];

    expect(query).toContain("published_at IS NULL");
    expect(query).toContain("retry_count < $1");
    expect(values).toEqual([3, 25]);
    expect(events).toHaveLength(1);
  });

  it("marks events as published", async () => {
    const pool = createPool([{ ...outboxRow, published_at: "2026-06-04T12:01:00.000Z" }]);
    const repository = createRepository(pool);

    const event = await repository.markPublished(outboxRow.id);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("SET published_at"), [
      outboxRow.id
    ]);
    expect(event.publishedAt).toBe("2026-06-04T12:01:00.000Z");
  });

  it("records failed publish attempts for retry", async () => {
    const pool = createPool([{ ...outboxRow, retry_count: 1, last_error: "redis down" }]);
    const repository = createRepository(pool);

    const event = await repository.markFailed(outboxRow.id, new Error("redis down"));

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("retry_count + 1"), [
      outboxRow.id,
      "redis down"
    ]);
    expect(event.retryCount).toBe(1);
    expect(event.lastError).toBe("redis down");
  });
});
