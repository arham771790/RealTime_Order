import { createSocketServer } from "../../src/sockets/socket-server.js";

class FakeServerClass {
  static instances = [];

  constructor(httpServer, options) {
    this.httpServer = httpServer;
    this.options = options;
    this.handlers = new Map();
    FakeServerClass.instances.push(this);
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }
}

describe("createSocketServer", () => {
  it("creates Socket.IO with heartbeat and CORS configuration", () => {
    FakeServerClass.instances = [];
    const httpServer = {};

    const { io, socketManager } = createSocketServer(httpServer, {
      corsOrigin: "http://localhost:5173",
      pingIntervalMs: 25000,
      pingTimeoutMs: 20000,
      ServerClass: FakeServerClass
    });

    expect(io).toBe(FakeServerClass.instances[0]);
    expect(io.httpServer).toBe(httpServer);
    expect(io.options).toEqual({
      cors: {
        origin: "http://localhost:5173"
      },
      pingInterval: 25000,
      pingTimeout: 20000
    });
    expect(socketManager.getConnectionCount()).toBe(0);
    expect(io.handlers.has("connection")).toBe(true);
  });
});
