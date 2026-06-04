import { RoomManager } from "../../src/sockets/room-manager.js";

describe("RoomManager", () => {
  it("builds canonical room names", () => {
    const roomManager = new RoomManager();

    expect(roomManager.getAdminRoom()).toBe("admin:global");
    expect(roomManager.getOrderRoom("42")).toBe("order:42");
    expect(roomManager.getCustomerRoom(" Ada Lovelace ")).toBe("customer:Ada Lovelace");
    expect(roomManager.getStatusRoom("pending")).toBe("status:pending");
  });

  it("builds all rooms for an order", () => {
    const roomManager = new RoomManager();

    expect(
      roomManager.getRoomsForOrder({
        id: 42,
        customerName: "Ada Lovelace",
        status: "shipped"
      })
    ).toEqual(["admin:global", "order:42", "customer:Ada Lovelace", "status:shipped"]);
  });

  it("normalizes supported room payloads", () => {
    const roomManager = new RoomManager();

    expect(roomManager.normalizeRoom({ room: " admin:global " })).toBe("admin:global");
    expect(roomManager.normalizeRoom("order:42")).toBe("order:42");
    expect(roomManager.normalizeRoom("customer: Ada Lovelace ")).toBe("customer:Ada Lovelace");
    expect(roomManager.normalizeRoom("status:delivered")).toBe("status:delivered");
  });

  it("rejects invalid room payloads", () => {
    const roomManager = new RoomManager();

    expect(() => roomManager.normalizeRoom("")).toThrow("room is required.");
    expect(() => roomManager.normalizeRoom("order:0")).toThrow(
      "orderId must be a positive integer."
    );
    expect(() => roomManager.normalizeRoom("status:cancelled")).toThrow(
      "status must be one of: pending, shipped, delivered."
    );
    expect(() => roomManager.normalizeRoom("unknown:room")).toThrow(
      "room must be admin:global, order:{id}, customer:{name}, or status:{status}."
    );
  });
});
