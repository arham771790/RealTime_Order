import { ORDER_STATUSES } from "../services/orders.service.js";

const ADMIN_GLOBAL_ROOM = "admin:global";
const MAX_ROOM_NAME_LENGTH = 200;

function validateRoomLength(room) {
  if (room.length > MAX_ROOM_NAME_LENGTH) {
    throw new Error(`room must be ${MAX_ROOM_NAME_LENGTH} characters or fewer.`);
  }
}

function validatePositiveInteger(fieldName, value) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return numberValue;
}

function validateName(fieldName, value) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a string.`);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function validateStatus(status) {
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error(`status must be one of: ${ORDER_STATUSES.join(", ")}.`);
  }

  return status;
}

export class RoomManager {
  getAdminRoom() {
    return ADMIN_GLOBAL_ROOM;
  }

  getOrderRoom(orderId) {
    return `order:${validatePositiveInteger("orderId", orderId)}`;
  }

  getCustomerRoom(customerName) {
    const room = `customer:${validateName("customerName", customerName)}`;
    validateRoomLength(room);
    return room;
  }

  getStatusRoom(status) {
    return `status:${validateStatus(status)}`;
  }

  getRoomsForOrder(order) {
    return [
      this.getAdminRoom(),
      this.getOrderRoom(order.id),
      this.getCustomerRoom(order.customerName),
      this.getStatusRoom(order.status)
    ];
  }

  normalizeRoom(payload) {
    const room = typeof payload === "string" ? payload : payload?.room;

    if (typeof room !== "string" || room.trim().length === 0) {
      throw new Error("room is required.");
    }

    const normalizedRoom = room.trim();
    validateRoomLength(normalizedRoom);

    if (normalizedRoom === ADMIN_GLOBAL_ROOM) {
      return normalizedRoom;
    }

    const [type, ...valueParts] = normalizedRoom.split(":");
    const value = valueParts.join(":");

    if (type === "order") {
      return this.getOrderRoom(value);
    }

    if (type === "customer") {
      return this.getCustomerRoom(value);
    }

    if (type === "status") {
      return this.getStatusRoom(value);
    }

    throw new Error("room must be admin:global, order:{id}, customer:{name}, or status:{status}.");
  }
}

export default RoomManager;
