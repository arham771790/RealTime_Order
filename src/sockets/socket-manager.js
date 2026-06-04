const MAX_ROOM_NAME_LENGTH = 200;

function normalizeRoom(payload) {
  const room = typeof payload === "string" ? payload : payload?.room;

  if (typeof room !== "string" || room.trim().length === 0) {
    throw new Error("room is required.");
  }

  const normalizedRoom = room.trim();

  if (normalizedRoom.length > MAX_ROOM_NAME_LENGTH) {
    throw new Error(`room must be ${MAX_ROOM_NAME_LENGTH} characters or fewer.`);
  }

  return normalizedRoom;
}

function sendAck(ack, payload) {
  if (typeof ack === "function") {
    ack(payload);
  }
}

export class SocketManager {
  constructor({ io, logger = console } = {}) {
    if (!io) {
      throw new Error("SocketManager requires a Socket.IO server.");
    }

    this.io = io;
    this.logger = logger;
    this.connections = new Map();
  }

  initialize() {
    this.io.on("connection", (socket) => {
      this.handleConnection(socket);
    });

    return this;
  }

  handleConnection(socket) {
    this.connections.set(socket.id, {
      connectedAt: new Date(),
      rooms: new Set()
    });

    this.logger.info({ event: "socket_connected", socketId: socket.id });
    socket.emit("connection:ready", { socketId: socket.id });

    socket.on("subscribe", (payload, ack) => {
      this.subscribe(socket, payload, ack);
    });

    socket.on("unsubscribe", (payload, ack) => {
      this.unsubscribe(socket, payload, ack);
    });

    socket.on("disconnect", (reason) => {
      this.handleDisconnect(socket, reason);
    });
  }

  async subscribe(socket, payload, ack) {
    try {
      const room = normalizeRoom(payload);
      await socket.join(room);

      const connection = this.connections.get(socket.id);
      connection?.rooms.add(room);

      const rooms = this.getRooms(socket.id);
      socket.emit("subscription:updated", { rooms });
      sendAck(ack, { ok: true, room, rooms });
    } catch (error) {
      sendAck(ack, { ok: false, error: error.message });
    }
  }

  async unsubscribe(socket, payload, ack) {
    try {
      const room = normalizeRoom(payload);
      await socket.leave(room);

      const connection = this.connections.get(socket.id);
      connection?.rooms.delete(room);

      const rooms = this.getRooms(socket.id);
      socket.emit("subscription:updated", { rooms });
      sendAck(ack, { ok: true, room, rooms });
    } catch (error) {
      sendAck(ack, { ok: false, error: error.message });
    }
  }

  handleDisconnect(socket, reason) {
    this.connections.delete(socket.id);
    this.logger.info({ event: "socket_disconnected", socketId: socket.id, reason });
  }

  getConnectionCount() {
    return this.connections.size;
  }

  getRooms(socketId) {
    const connection = this.connections.get(socketId);

    if (!connection) {
      return [];
    }

    return Array.from(connection.rooms).sort();
  }
}

export default SocketManager;
