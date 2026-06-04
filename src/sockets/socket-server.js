import { Server as SocketIOServer } from "socket.io";

import { SocketManager } from "./socket-manager.js";

export function createSocketServer(
  httpServer,
  { corsOrigin, pingIntervalMs, pingTimeoutMs, logger = console, ServerClass = SocketIOServer } = {}
) {
  const io = new ServerClass(httpServer, {
    cors: {
      origin: corsOrigin
    },
    pingInterval: pingIntervalMs,
    pingTimeout: pingTimeoutMs
  });

  const socketManager = new SocketManager({ io, logger }).initialize();

  return {
    io,
    socketManager
  };
}
