import { jest } from "@jest/globals";

import { EventCoalescer, getCoalescingKey } from "../../src/utils/event-coalescer.js";

function createLogger() {
  return {
    info: jest.fn()
  };
}

const firstUpdate = {
  eventId: "evt-1",
  operation: "UPDATE",
  orderId: 42,
  old: { id: 42, status: "pending" },
  new: { id: 42, status: "shipped" }
};

const finalUpdate = {
  ...firstUpdate,
  eventId: "evt-2",
  new: { id: 42, status: "delivered" }
};

describe("EventCoalescer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("derives a stable coalescing key for order events", () => {
    expect(getCoalescingKey(firstUpdate)).toBe(42);
    expect(getCoalescingKey({ aggregateId: "42", eventId: "evt-3" })).toBe("42");
  });

  it("debounces duplicate order updates and flushes the final event", () => {
    const flush = jest.fn();
    const coalescer = new EventCoalescer({ logger: createLogger(), windowMs: 100 });

    coalescer.enqueue(firstUpdate, flush);
    coalescer.enqueue(finalUpdate, flush);

    expect(coalescer.size).toBe(1);
    jest.advanceTimersByTime(99);
    expect(flush).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(finalUpdate);
    expect(coalescer.size).toBe(0);
  });

  it("keeps different orders in separate debounce buckets", () => {
    const flush = jest.fn();
    const coalescer = new EventCoalescer({ logger: createLogger(), windowMs: 100 });
    const otherOrderUpdate = {
      ...firstUpdate,
      eventId: "evt-3",
      orderId: 99,
      new: { id: 99, status: "pending" }
    };

    coalescer.enqueue(firstUpdate, flush);
    coalescer.enqueue(otherOrderUpdate, flush);
    jest.advanceTimersByTime(100);

    expect(flush).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenCalledWith(firstUpdate);
    expect(flush).toHaveBeenCalledWith(otherOrderUpdate);
    expect(coalescer.size).toBe(0);
  });

  it("flushes and clears pending timers during cleanup", () => {
    const flush = jest.fn();
    const coalescer = new EventCoalescer({ logger: createLogger(), windowMs: 100 });

    coalescer.enqueue(firstUpdate, flush);
    coalescer.flushAll();
    coalescer.clear();
    jest.advanceTimersByTime(100);

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(firstUpdate);
    expect(coalescer.size).toBe(0);
  });
});
