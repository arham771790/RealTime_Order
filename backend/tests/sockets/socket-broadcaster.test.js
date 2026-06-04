import { jest } from "@jest/globals";

import { SocketBroadcaster } from "../../src/sockets/socket-broadcaster.js";

function createIo() {
  const roomTarget = {
    emit: jest.fn()
  };

  return {
    to: jest.fn(() => roomTarget),
    roomTarget
  };
}

function createLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn()
  };
}

const updateEvent = {
  eventId: "evt-1",
  operation: "UPDATE",
  orderId: 42,
  old: {
    id: 42,
    customer_name: "Ada Lovelace",
    product_name: "Keyboard",
    status: "pending"
  },
  new: {
    id: 42,
    customer_name: "Ada Lovelace",
    product_name: "Keyboard",
    status: "shipped"
  }
};

describe("SocketBroadcaster", () => {
  it("requires a Socket.IO server", () => {
    expect(() => new SocketBroadcaster()).toThrow("SocketBroadcaster requires a Socket.IO server.");
  });

  it("broadcasts order events to canonical rooms", () => {
    const io = createIo();
    const logger = createLogger();
    const broadcaster = new SocketBroadcaster({ io, logger });

    const rooms = broadcaster.broadcastOrderEvent(updateEvent);

    expect(rooms).toEqual(["admin:global", "order:42", "customer:Ada Lovelace", "status:shipped"]);
    expect(io.to).toHaveBeenCalledWith(rooms);
    expect(io.roomTarget.emit).toHaveBeenCalledWith("order:event", updateEvent);
  });

  it("uses the old row when broadcasting delete events", () => {
    const io = createIo();
    const broadcaster = new SocketBroadcaster({ io });
    const deleteEvent = {
      ...updateEvent,
      operation: "DELETE",
      new: null,
      old: {
        id: 42,
        customer_name: "Ada Lovelace",
        product_name: "Keyboard",
        status: "delivered"
      }
    };

    const rooms = broadcaster.broadcastOrderEvent(deleteEvent);

    expect(rooms).toEqual([
      "admin:global",
      "order:42",
      "customer:Ada Lovelace",
      "status:delivered"
    ]);
  });

  it("skips events without an order snapshot", () => {
    const io = createIo();
    const logger = createLogger();
    const broadcaster = new SocketBroadcaster({ io, logger });

    const rooms = broadcaster.broadcastOrderEvent({
      eventId: "evt-empty",
      operation: "UNKNOWN",
      old: null,
      new: null
    });

    expect(rooms).toEqual([]);
    expect(io.to).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith({
      event: "socket_order_event_skipped",
      reason: "missing_order_snapshot",
      eventId: "evt-empty"
    });
  });
});
