function mapOutboxRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventType: row.event_type,
    payload: row.payload,
    retryCount: row.retry_count,
    lastError: row.last_error,
    createdAt: row.created_at,
    publishedAt: row.published_at
  };
}

function normalizeError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export class OutboxRepository {
  constructor({ pool }) {
    if (!pool) {
      throw new Error("OutboxRepository requires a PostgreSQL pool.");
    }

    this.pool = pool;
  }

  async createEvent({ aggregateType, aggregateId, eventType, payload }, executor = this.pool) {
    const result = await executor.query(
      `
        INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING id, aggregate_type, aggregate_id, event_type, payload, retry_count, last_error, created_at, published_at
      `,
      [aggregateType, aggregateId, eventType, JSON.stringify(payload)]
    );

    return mapOutboxRow(result.rows[0]);
  }

  async getUnpublishedEvents({ limit = 100, maxRetries = 5 } = {}) {
    const result = await this.pool.query(
      `
        SELECT id, aggregate_type, aggregate_id, event_type, payload, retry_count, last_error, created_at, published_at
        FROM outbox_events
        WHERE published_at IS NULL
          AND retry_count < $1
        ORDER BY created_at ASC, id ASC
        LIMIT $2
      `,
      [maxRetries, limit]
    );

    return result.rows.map(mapOutboxRow);
  }

  async countUnpublishedEvents({ maxRetries = 5 } = {}) {
    const result = await this.pool.query(
      `
        SELECT COUNT(*)::INTEGER AS count
        FROM outbox_events
        WHERE published_at IS NULL
          AND retry_count < $1
      `,
      [maxRetries]
    );

    return result.rows[0]?.count ?? 0;
  }

  async markPublished(id, executor = this.pool) {
    const result = await executor.query(
      `
        UPDATE outbox_events
        SET published_at = CURRENT_TIMESTAMP,
            last_error = NULL
        WHERE id = $1
        RETURNING id, aggregate_type, aggregate_id, event_type, payload, retry_count, last_error, created_at, published_at
      `,
      [id]
    );

    return mapOutboxRow(result.rows[0]);
  }

  async markFailed(id, error, executor = this.pool) {
    const result = await executor.query(
      `
        UPDATE outbox_events
        SET retry_count = retry_count + 1,
            last_error = $2
        WHERE id = $1
        RETURNING id, aggregate_type, aggregate_id, event_type, payload, retry_count, last_error, created_at, published_at
      `,
      [id, normalizeError(error)]
    );

    return mapOutboxRow(result.rows[0]);
  }
}

export function createOutboxRepository(pool) {
  return new OutboxRepository({ pool });
}

export default OutboxRepository;
