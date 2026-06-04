import { RoomManager } from "./room-manager.js";
import { recordSocketBroadcast } from "../metrics/prometheus.js";

const ORDER_EVENT_NAME = "order:event";

function getOrderSnapshot(changeEvent) {
  const row = changeEvent.new ?? changeEvent.old;

  if (!row) {
    return null;
  }

  return {
    id: row.id ?? changeEvent.orderId,
    customerName: row.customerName ?? row.customer_name,
    status: row.status
  };
}

export class SocketBroadcaster {
  constructor({ io, roomManager = new RoomManager(), logger = console } = {}) {
    if (!io) {
      throw new Error("SocketBroadcaster requires a Socket.IO server.");
    }

    this.io = io;
    this.roomManager = roomManager;
    this.logger = logger;
  }

  broadcastOrderEvent(changeEvent) {
    const order = getOrderSnapshot(changeEvent);

    if (!order) {
      this.logger.warn({
        event: "socket_order_event_skipped",
        reason: "missing_order_snapshot",
        eventId: changeEvent.eventId
      });
      return [];
    }

    const rooms = this.roomManager.getRoomsForOrder(order);

    this.io.to(rooms).emit(ORDER_EVENT_NAME, changeEvent);
    recordSocketBroadcast();
    this.logger.info({
      event: "socket_order_event_broadcast",
      eventId: changeEvent.eventId,
      operation: changeEvent.operation,
      rooms
    });

    return rooms;
  }
}

export default SocketBroadcaster;
