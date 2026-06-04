import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { SocketManager } from "../../src/sockets/socket-manager.js";

class FakeSocket extends EventEmitter {
  constructor(id = "socket-1") {
    super();
    this.id = id;
    this.join = jest.fn().mockResolvedValue();
    this.leave = jest.fn().mockResolvedValue();
    this.sentEvents = [];
  }

  emit(event, payload) {
    this.sentEvents.push({ event, payload });
    return true;
  }

  trigger(event, ...args) {
    return super.emit(event, ...args);
  }
}

class FakeIo extends EventEmitter {
  connect(socket) {
    this.emit("connection", socket);
  }
}

function createLogger() {
  return {
    info: jest.fn()
  };
}

describe("SocketManager", () => {
  it("requires a Socket.IO server", () => {
    expect(() => new SocketManager()).toThrow("SocketManager requires a Socket.IO server.");
  });

  it("tracks new connections and emits a ready event", () => {
    const io = new FakeIo();
    const logger = createLogger();
    const manager = new SocketManager({ io, logger }).initialize();
    const socket = new FakeSocket();

    io.connect(socket);

    expect(manager.getConnectionCount()).toBe(1);
    expect(socket.sentEvents).toContainEqual({
      event: "connection:ready",
      payload: { socketId: "socket-1" }
    });
    expect(logger.info).toHaveBeenCalledWith({ event: "socket_connected", socketId: "socket-1" });
  });

  it("subscribes a socket to a room", async () => {
    const manager = new SocketManager({ io: new FakeIo(), logger: createLogger() });
    const socket = new FakeSocket();
    const ack = jest.fn();

    manager.handleConnection(socket);
    await manager.subscribe(socket, { room: "admin:global" }, ack);

    expect(socket.join).toHaveBeenCalledWith("admin:global");
    expect(manager.getRooms(socket.id)).toEqual(["admin:global"]);
    expect(ack).toHaveBeenCalledWith({
      ok: true,
      room: "admin:global",
      rooms: ["admin:global"]
    });
    expect(socket.sentEvents).toContainEqual({
      event: "subscription:updated",
      payload: { rooms: ["admin:global"] }
    });
  });

  it("unsubscribes a socket from a room", async () => {
    const manager = new SocketManager({ io: new FakeIo(), logger: createLogger() });
    const socket = new FakeSocket();
    const ack = jest.fn();

    manager.handleConnection(socket);
    await manager.subscribe(socket, "order:42");
    await manager.unsubscribe(socket, "order:42", ack);

    expect(socket.leave).toHaveBeenCalledWith("order:42");
    expect(manager.getRooms(socket.id)).toEqual([]);
    expect(ack).toHaveBeenCalledWith({ ok: true, room: "order:42", rooms: [] });
  });

  it("acknowledges invalid room payloads without throwing", async () => {
    const manager = new SocketManager({ io: new FakeIo(), logger: createLogger() });
    const socket = new FakeSocket();
    const ack = jest.fn();

    manager.handleConnection(socket);
    await manager.subscribe(socket, { room: "" }, ack);

    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({ ok: false, error: "room is required." });
  });

  it("rejects unsupported room names", async () => {
    const manager = new SocketManager({ io: new FakeIo(), logger: createLogger() });
    const socket = new FakeSocket();
    const ack = jest.fn();

    manager.handleConnection(socket);
    await manager.subscribe(socket, "unknown:room", ack);

    expect(socket.join).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith({
      ok: false,
      error: "room must be admin:global, order:{id}, customer:{name}, or status:{status}."
    });
  });

  it("removes connection state on disconnect", () => {
    const manager = new SocketManager({ io: new FakeIo(), logger: createLogger() });
    const socket = new FakeSocket();

    manager.handleConnection(socket);
    socket.trigger("disconnect", "client namespace disconnect");

    expect(manager.getConnectionCount()).toBe(0);
  });
});
