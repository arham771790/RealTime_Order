const DEFAULT_WINDOW_MS = 100;

export function getCoalescingKey(event) {
  return event.orderId ?? event.new?.id ?? event.old?.id ?? event.aggregateId ?? event.eventId;
}

export class EventCoalescer {
  constructor({
    clearTimeoutFn = clearTimeout,
    logger = console,
    setTimeoutFn = setTimeout,
    windowMs = DEFAULT_WINDOW_MS
  } = {}) {
    this.clearTimeoutFn = clearTimeoutFn;
    this.logger = logger;
    this.pendingEvents = new Map();
    this.setTimeoutFn = setTimeoutFn;
    this.windowMs = windowMs;
  }

  get size() {
    return this.pendingEvents.size;
  }

  enqueue(event, flushCallback) {
    const key = getCoalescingKey(event);

    if (!key) {
      flushCallback(event);
      return;
    }

    const existingEntry = this.pendingEvents.get(key);

    if (existingEntry) {
      this.clearTimeoutFn(existingEntry.timer);
    }

    const timer = this.setTimeoutFn(() => {
      this.flushKey(key);
    }, this.windowMs);

    this.pendingEvents.set(key, {
      event,
      flushCallback,
      timer
    });

    this.logger.info({
      event: "event_coalesced",
      key,
      pendingCount: this.pendingEvents.size,
      windowMs: this.windowMs
    });
  }

  flushKey(key) {
    const entry = this.pendingEvents.get(key);

    if (!entry) {
      return;
    }

    this.pendingEvents.delete(key);
    entry.flushCallback(entry.event);
  }

  flushAll() {
    const keys = [...this.pendingEvents.keys()];

    for (const key of keys) {
      const entry = this.pendingEvents.get(key);

      if (entry) {
        this.clearTimeoutFn(entry.timer);
      }

      this.flushKey(key);
    }
  }

  clear() {
    for (const entry of this.pendingEvents.values()) {
      this.clearTimeoutFn(entry.timer);
    }

    this.pendingEvents.clear();
  }
}

export default EventCoalescer;
