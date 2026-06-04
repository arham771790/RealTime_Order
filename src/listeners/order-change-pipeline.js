import { EventEmitter } from "node:events";

export class OrderChangePipeline extends EventEmitter {
  constructor({ dbChangeListener, redisPublisher, logger = console } = {}) {
    super();

    if (!dbChangeListener) {
      throw new Error("OrderChangePipeline requires a database change listener.");
    }

    if (!redisPublisher) {
      throw new Error("OrderChangePipeline requires a Redis publisher.");
    }

    this.dbChangeListener = dbChangeListener;
    this.redisPublisher = redisPublisher;
    this.logger = logger;
    this.isRunning = false;
    this.inFlightPublishes = new Set();
    this.handleChange = this.handleChange.bind(this);
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    this.dbChangeListener.on("change", this.handleChange);

    try {
      await this.redisPublisher.connect();
      await this.dbChangeListener.start();
      this.isRunning = true;
      this.logger.info({ event: "order_change_pipeline_started" });
    } catch (error) {
      this.dbChangeListener.off("change", this.handleChange);
      throw error;
    }
  }

  handleChange(changeEvent) {
    const publishPromise = this.publishChange(changeEvent);

    this.inFlightPublishes.add(publishPromise);
    publishPromise.finally(() => {
      this.inFlightPublishes.delete(publishPromise);
    });

    return publishPromise;
  }

  async publishChange(changeEvent) {
    try {
      await this.redisPublisher.publish(changeEvent);
      this.emit("published", changeEvent);
      this.logger.info({
        event: "order_change_published",
        eventId: changeEvent.eventId,
        operation: changeEvent.operation
      });
    } catch (error) {
      this.emit("publish_error", { error, changeEvent });
      this.logger.error({
        event: "order_change_publish_failed",
        eventId: changeEvent.eventId,
        operation: changeEvent.operation,
        error: error.message
      });
    }
  }

  async waitForIdle() {
    await Promise.all(this.inFlightPublishes);
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.dbChangeListener.off("change", this.handleChange);
    await this.waitForIdle();
    await this.dbChangeListener.stop();
    await this.redisPublisher.close();
    this.logger.info({ event: "order_change_pipeline_stopped" });
  }
}

export default OrderChangePipeline;
