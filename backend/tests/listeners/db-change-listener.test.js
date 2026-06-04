import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { DBChangeListener } from "../../src/listeners/db-change-listener.js";

function createLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

function createClientClass({ connectImpl } = {}) {
  const clients = [];

  class FakeClient extends EventEmitter {
    constructor(config) {
      super();
      this.config = config;
      this.connect = jest.fn(connectImpl ?? (() => Promise.resolve()));
      this.query = jest.fn().mockResolvedValue();
      this.end = jest.fn().mockResolvedValue();
      clients.push(this);
    }
  }

  return { ClientClass: FakeClient, clients };
}

describe("DBChangeListener", () => {
  it("connects a dedicated client and listens to order changes", async () => {
    const logger = createLogger();
    const { ClientClass, clients } = createClientClass();
    const listener = new DBChangeListener({
      connectionString: "postgresql://localhost/orders",
      ClientClass,
      logger
    });

    await listener.start();

    expect(clients).toHaveLength(1);
    expect(clients[0].config).toEqual({ connectionString: "postgresql://localhost/orders" });
    expect(clients[0].connect).toHaveBeenCalledTimes(1);
    expect(clients[0].query).toHaveBeenCalledWith("LISTEN order_changes");
    expect(logger.info).toHaveBeenCalledWith({
      event: "db_listener_connected",
      channel: "order_changes"
    });
  });

  it("emits parsed change payloads from matching notifications", async () => {
    const { ClientClass, clients } = createClientClass();
    const listener = new DBChangeListener({ ClientClass, logger: createLogger() });
    const receivedPayloads = [];

    listener.on("change", (payload) => {
      receivedPayloads.push(payload);
    });

    await listener.start();
    clients[0].emit("notification", {
      channel: "order_changes",
      payload: JSON.stringify({ operation: "INSERT", orderId: 42 })
    });
    clients[0].emit("notification", {
      channel: "other_channel",
      payload: JSON.stringify({ operation: "UPDATE", orderId: 99 })
    });

    expect(receivedPayloads).toEqual([{ operation: "INSERT", orderId: 42 }]);
  });

  it("logs invalid notification payloads without emitting change events", async () => {
    const logger = createLogger();
    const { ClientClass, clients } = createClientClass();
    const listener = new DBChangeListener({ ClientClass, logger });
    const changeHandler = jest.fn();

    listener.on("change", changeHandler);

    await listener.start();
    clients[0].emit("notification", {
      channel: "order_changes",
      payload: "{bad-json"
    });

    expect(changeHandler).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith({
      event: "db_notification_parse_failed",
      channel: "order_changes",
      error: expect.any(String)
    });
  });

  it("schedules reconnects when the client errors", async () => {
    const logger = createLogger();
    const { ClientClass, clients } = createClientClass();
    let reconnectHandler;
    const setTimeoutFn = jest.fn((handler) => {
      reconnectHandler = handler;
      return "timer-id";
    });
    const listener = new DBChangeListener({
      ClientClass,
      logger,
      reconnectDelayMs: 25,
      setTimeoutFn
    });

    await listener.start();
    clients[0].emit("error", new Error("connection lost"));

    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 25);

    await reconnectHandler();

    expect(clients).toHaveLength(2);
    expect(clients[1].connect).toHaveBeenCalledTimes(1);
    expect(clients[1].query).toHaveBeenCalledWith("LISTEN order_changes");
  });

  it("cleans up the client and pending reconnect timer on stop", async () => {
    const logger = createLogger();
    const { ClientClass, clients } = createClientClass();
    const clearTimeoutFn = jest.fn();
    const setTimeoutFn = jest.fn(() => "timer-id");
    const listener = new DBChangeListener({
      ClientClass,
      logger,
      setTimeoutFn,
      clearTimeoutFn
    });

    await listener.start();
    clients[0].emit("end");
    await listener.stop();

    expect(clearTimeoutFn).toHaveBeenCalledWith("timer-id");
    expect(clients[0].query).toHaveBeenCalledWith("UNLISTEN order_changes");
    expect(clients[0].end).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith({
      event: "db_listener_stopped",
      channel: "order_changes"
    });
  });

  it("rejects unsafe channel names", () => {
    expect(() => new DBChangeListener({ channel: "order_changes;DROP TABLE orders" })).toThrow(
      "LISTEN channel must be a valid PostgreSQL identifier."
    );
  });
});
