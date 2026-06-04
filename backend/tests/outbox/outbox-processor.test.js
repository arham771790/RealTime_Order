import { jest } from "@jest/globals";

import { OutboxProcessor } from "../../src/outbox/outbox-processor.js";

const outboxEvent = {
  id: "evt-1",
  aggregateType: "order",
  aggregateId: "42",
  eventType: "order.created",
  payload: {
    operation: "INSERT",
    table: "orders",
    orderId: 42,
    old: null,
    new: { id: 42, status: "pending" }
  },
  retryCount: 0,
  lastError: null,
  createdAt: "2026-06-04T12:00:00.000Z",
  publishedAt: null
};

function createLogger() {
  return {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  };
}

function createOutboxRepository(events = [outboxEvent]) {
  return {
    getUnpublishedEvents: jest.fn().mockResolvedValue(events),
    markPublished: jest.fn().mockResolvedValue({ ...outboxEvent, publishedAt: "now" }),
    markFailed: jest.fn().mockResolvedValue({ ...outboxEvent, retryCount: 1 })
  };
}

function createRedisPublisher() {
  return {
    close: jest.fn().mockResolvedValue(),
    connect: jest.fn().mockResolvedValue(),
    publish: jest.fn().mockResolvedValue(1)
  };
}

function createProcessor(overrides = {}) {
  return new OutboxProcessor({
    batchSize: 25,
    logger: createLogger(),
    maxRetries: 3,
    outboxRepository: createOutboxRepository(),
    pollIntervalMs: 5000,
    redisPublisher: createRedisPublisher(),
    ...overrides
  });
}

describe("OutboxProcessor", () => {
  it("requires an outbox repository", () => {
    expect(() => createProcessor({ outboxRepository: undefined })).toThrow(
      "OutboxProcessor requires an outbox repository."
    );
  });

  it("requires a Redis publisher", () => {
    expect(() => createProcessor({ redisPublisher: undefined })).toThrow(
      "OutboxProcessor requires a Redis publisher."
    );
  });

  it("publishes unpublished outbox events and marks them complete", async () => {
    const outboxRepository = createOutboxRepository();
    const redisPublisher = createRedisPublisher();
    const processor = createProcessor({ outboxRepository, redisPublisher });

    const result = await processor.processBatch();

    expect(outboxRepository.getUnpublishedEvents).toHaveBeenCalledWith({
      limit: 25,
      maxRetries: 3
    });
    expect(redisPublisher.publish).toHaveBeenCalledWith({
      eventId: "evt-1",
      eventType: "order.created",
      aggregateType: "order",
      aggregateId: "42",
      occurredAt: "2026-06-04T12:00:00.000Z",
      operation: "INSERT",
      table: "orders",
      orderId: 42,
      old: null,
      new: { id: 42, status: "pending" }
    });
    expect(outboxRepository.markPublished).toHaveBeenCalledWith("evt-1");
    expect(result).toEqual({ failed: 0, processed: 1, skipped: false });
  });

  it("marks failed publishes for retry", async () => {
    const outboxRepository = createOutboxRepository();
    const redisPublisher = createRedisPublisher();
    const error = new Error("redis down");
    redisPublisher.publish.mockRejectedValue(error);
    const processor = createProcessor({ outboxRepository, redisPublisher });

    const result = await processor.processBatch();

    expect(outboxRepository.markPublished).not.toHaveBeenCalled();
    expect(outboxRepository.markFailed).toHaveBeenCalledWith("evt-1", error);
    expect(result).toEqual({ failed: 1, processed: 0, skipped: false });
  });

  it("starts polling and stops cleanly", async () => {
    const outboxRepository = createOutboxRepository([]);
    const redisPublisher = createRedisPublisher();
    const setIntervalFn = jest.fn(() => "timer-1");
    const clearIntervalFn = jest.fn();
    const processor = createProcessor({
      clearIntervalFn,
      outboxRepository,
      redisPublisher,
      setIntervalFn
    });

    await processor.start();
    await processor.stop();

    expect(redisPublisher.connect).toHaveBeenCalledTimes(1);
    expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 5000);
    expect(clearIntervalFn).toHaveBeenCalledWith("timer-1");
    expect(redisPublisher.close).toHaveBeenCalledTimes(1);
  });

  it("skips overlapping batches", async () => {
    let resolveBatch;
    const outboxRepository = createOutboxRepository();
    outboxRepository.getUnpublishedEvents.mockReturnValue(
      new Promise((resolve) => {
        resolveBatch = resolve;
      })
    );
    const logger = createLogger();
    const processor = createProcessor({ logger, outboxRepository });

    const firstRun = processor.processBatch();
    const secondRun = await processor.processBatch();
    resolveBatch([]);

    await firstRun;

    expect(secondRun).toEqual({ failed: 0, processed: 0, skipped: true });
    expect(logger.warn).toHaveBeenCalledWith({
      event: "outbox_processor_batch_skipped",
      reason: "batch_in_progress"
    });
  });
});
