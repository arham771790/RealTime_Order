import env from "../config/env.js";
import pool from "../db/pool.js";
import {
  recordOutboxFailed,
  recordOutboxPublished,
  setOutboxBacklog
} from "../metrics/prometheus.js";
import { RedisPublisher } from "../publishers/redis-publisher.js";
import { OutboxRepository } from "./outbox.repository.js";

function toRedisEvent(outboxEvent) {
  return {
    eventId: outboxEvent.id,
    eventType: outboxEvent.eventType,
    aggregateType: outboxEvent.aggregateType,
    aggregateId: outboxEvent.aggregateId,
    occurredAt: outboxEvent.createdAt,
    ...outboxEvent.payload
  };
}

export class OutboxProcessor {
  constructor({
    batchSize = env.outbox.batchSize,
    clearIntervalFn = clearInterval,
    logger = console,
    maxRetries = env.outbox.maxRetries,
    outboxRepository,
    pollIntervalMs = env.outbox.pollIntervalMs,
    redisPublisher,
    setIntervalFn = setInterval
  } = {}) {
    if (!outboxRepository) {
      throw new Error("OutboxProcessor requires an outbox repository.");
    }

    if (!redisPublisher) {
      throw new Error("OutboxProcessor requires a Redis publisher.");
    }

    this.batchSize = batchSize;
    this.clearIntervalFn = clearIntervalFn;
    this.currentRun = null;
    this.isRunning = false;
    this.logger = logger;
    this.maxRetries = maxRetries;
    this.outboxRepository = outboxRepository;
    this.pollIntervalMs = pollIntervalMs;
    this.redisPublisher = redisPublisher;
    this.setIntervalFn = setIntervalFn;
    this.timer = null;
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    await this.redisPublisher.connect();
    this.isRunning = true;
    await this.processBatch();
    this.timer = this.setIntervalFn(() => {
      void this.processBatch();
    }, this.pollIntervalMs);

    this.logger.info({
      event: "outbox_processor_started",
      pollIntervalMs: this.pollIntervalMs,
      batchSize: this.batchSize
    });
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.timer) {
      this.clearIntervalFn(this.timer);
      this.timer = null;
    }

    if (this.currentRun) {
      await this.currentRun;
    }

    await this.redisPublisher.close();
    this.logger.info({ event: "outbox_processor_stopped" });
  }

  async processBatch() {
    if (this.currentRun) {
      this.logger.warn({ event: "outbox_processor_batch_skipped", reason: "batch_in_progress" });
      return { failed: 0, processed: 0, skipped: true };
    }

    const run = this.runBatch();
    this.currentRun = run;

    try {
      return await run;
    } finally {
      if (this.currentRun === run) {
        this.currentRun = null;
      }
    }
  }

  async runBatch() {
    const outboxEvents = await this.outboxRepository.getUnpublishedEvents({
      limit: this.batchSize,
      maxRetries: this.maxRetries
    });
    await this.refreshBacklogMetric();
    let processed = 0;
    let failed = 0;

    for (const outboxEvent of outboxEvents) {
      const didPublish = await this.publishOutboxEvent(outboxEvent);

      if (didPublish) {
        processed += 1;
      } else {
        failed += 1;
      }
    }

    this.logger.info({
      event: "outbox_processor_batch_completed",
      found: outboxEvents.length,
      processed,
      failed
    });

    return { failed, processed, skipped: false };
  }

  async publishOutboxEvent(outboxEvent) {
    try {
      await this.redisPublisher.publish(toRedisEvent(outboxEvent));
      await this.outboxRepository.markPublished(outboxEvent.id);
      recordOutboxPublished();
      this.logger.info({
        event: "outbox_event_published",
        outboxEventId: outboxEvent.id,
        eventType: outboxEvent.eventType
      });

      return true;
    } catch (error) {
      await this.outboxRepository.markFailed(outboxEvent.id, error);
      recordOutboxFailed();
      this.logger.error({
        event: "outbox_event_publish_failed",
        outboxEventId: outboxEvent.id,
        eventType: outboxEvent.eventType,
        error: error.message
      });

      return false;
    }
  }

  async refreshBacklogMetric() {
    if (typeof this.outboxRepository.countUnpublishedEvents !== "function") {
      return;
    }

    const backlog = await this.outboxRepository.countUnpublishedEvents({
      maxRetries: this.maxRetries
    });
    setOutboxBacklog(backlog);
  }
}

export function createOutboxProcessor({ dbPool = pool, logger = console } = {}) {
  return new OutboxProcessor({
    outboxRepository: new OutboxRepository({ pool: dbPool }),
    redisPublisher: new RedisPublisher({ logger }),
    logger
  });
}

export default OutboxProcessor;
