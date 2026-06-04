import { RedisSubscriber } from "./redis-subscriber.js";
import { observeOrderEventLag } from "../metrics/prometheus.js";
import { SocketBroadcaster } from "../sockets/socket-broadcaster.js";
import { EventCoalescer } from "../utils/event-coalescer.js";

export class OrderEventSubscriber {
  constructor({ eventCoalescer, logger = console, redisSubscriber, socketBroadcaster } = {}) {
    if (!redisSubscriber) {
      throw new Error("OrderEventSubscriber requires a Redis subscriber.");
    }

    if (!socketBroadcaster) {
      throw new Error("OrderEventSubscriber requires a socket broadcaster.");
    }

    this.redisSubscriber = redisSubscriber;
    this.socketBroadcaster = socketBroadcaster;
    this.eventCoalescer = eventCoalescer ?? new EventCoalescer({ logger });
    this.logger = logger;
    this.isRunning = false;
    this.handleEvent = this.handleEvent.bind(this);
    this.forwardEvent = this.forwardEvent.bind(this);
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.redisSubscriber.on("event", this.handleEvent);

    try {
      await this.redisSubscriber.connect();
      this.isRunning = true;
      this.logger.info({ event: "order_event_subscriber_started" });
    } catch (error) {
      this.redisSubscriber.off("event", this.handleEvent);
      throw error;
    }
  }

  handleEvent(changeEvent) {
    this.eventCoalescer.enqueue(changeEvent, this.forwardEvent);
  }

  forwardEvent(changeEvent) {
    try {
      observeOrderEventLag(changeEvent);
      const rooms = this.socketBroadcaster.broadcastOrderEvent(changeEvent);
      this.logger.info({
        event: "order_event_forwarded_to_sockets",
        eventId: changeEvent.eventId,
        roomCount: rooms.length
      });
    } catch (error) {
      this.logger.error({
        event: "order_event_socket_broadcast_failed",
        eventId: changeEvent.eventId,
        error: error.message
      });
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.redisSubscriber.off("event", this.handleEvent);
    this.eventCoalescer.flushAll();
    this.eventCoalescer.clear();
    await this.redisSubscriber.close();
    this.logger.info({ event: "order_event_subscriber_stopped" });
  }
}

export function createOrderEventSubscriber({ io, logger = console } = {}) {
  return new OrderEventSubscriber({
    redisSubscriber: new RedisSubscriber({ logger }),
    socketBroadcaster: new SocketBroadcaster({ io, logger }),
    logger
  });
}

export default OrderEventSubscriber;
