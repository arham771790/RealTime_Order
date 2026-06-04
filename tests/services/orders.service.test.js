import { jest } from "@jest/globals";

import { OrdersService } from "../../src/services/orders.service.js";
import { NotFoundError, ValidationError } from "../../src/utils/errors.js";

const order = {
  id: 1,
  customerName: "Ada Lovelace",
  productName: "Mechanical Keyboard",
  status: "pending",
  updatedAt: "2026-06-04T12:00:00.000Z"
};

function createRepository(overrides = {}) {
  return {
    createOrder: jest.fn().mockResolvedValue(order),
    getOrder: jest.fn().mockResolvedValue(order),
    getOrders: jest.fn().mockResolvedValue([order]),
    updateOrder: jest.fn().mockResolvedValue({ ...order, status: "shipped" }),
    deleteOrder: jest.fn().mockResolvedValue(order),
    ...overrides
  };
}

function createNotificationService(overrides = {}) {
  return {
    sendDeliveredOrderNotification: jest.fn().mockResolvedValue({ sent: true }),
    ...overrides
  };
}

function createService(
  repository = createRepository(),
  notificationService = createNotificationService()
) {
  return new OrdersService({ notificationService, ordersRepository: repository });
}

describe("OrdersService", () => {
  it("requires an orders repository", () => {
    expect(() => new OrdersService({})).toThrow("OrdersService requires an orders repository.");
  });

  it("creates an order with trimmed input and default pending status", async () => {
    const repository = createRepository();
    const service = createService(repository);

    await service.createOrder({
      customerName: " Ada Lovelace ",
      productName: " Mechanical Keyboard "
    });

    expect(repository.createOrder).toHaveBeenCalledWith({
      customerName: "Ada Lovelace",
      productName: "Mechanical Keyboard",
      status: "pending"
    });
  });

  it("rejects invalid create order input", async () => {
    const service = createService();

    await expect(
      service.createOrder({
        customerName: "",
        productName: "Mechanical Keyboard",
        status: "pending"
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("gets an order by id", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.getOrder("1");

    expect(repository.getOrder).toHaveBeenCalledWith(1);
    expect(result).toEqual(order);
  });

  it("throws a not found error when an order does not exist", async () => {
    const service = createService(
      createRepository({ getOrder: jest.fn().mockResolvedValue(null) })
    );

    await expect(service.getOrder(99)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists orders with normalized filters", async () => {
    const repository = createRepository();
    const service = createService(repository);

    await service.getOrders({
      customerName: " Ada ",
      status: "pending",
      limit: "25",
      offset: "10"
    });

    expect(repository.getOrders).toHaveBeenCalledWith({
      customerName: "Ada",
      status: "pending",
      limit: 25,
      offset: 10
    });
  });

  it("rejects invalid list filters", async () => {
    const service = createService();

    await expect(service.getOrders({ status: "cancelled" })).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(service.getOrders({ limit: 101 })).rejects.toBeInstanceOf(ValidationError);
  });

  it("updates order status", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.updateOrderStatus(1, "shipped");

    expect(repository.updateOrder).toHaveBeenCalledWith(1, { status: "shipped" });
    expect(result.status).toBe("shipped");
  });

  it("sends a delivered-order notification when an order is delivered", async () => {
    const repository = createRepository({
      updateOrder: jest.fn().mockResolvedValue({ ...order, status: "delivered" })
    });
    const notificationService = createNotificationService();
    const service = createService(repository, notificationService);

    const result = await service.updateOrderStatus(1, "delivered");

    expect(result.status).toBe("delivered");
    expect(notificationService.sendDeliveredOrderNotification).toHaveBeenCalledWith({
      ...order,
      status: "delivered"
    });
  });

  it("isolates delivered-order notification failures", async () => {
    const repository = createRepository({
      updateOrder: jest.fn().mockResolvedValue({ ...order, status: "delivered" })
    });
    const logger = { error: jest.fn() };
    const notificationService = createNotificationService({
      sendDeliveredOrderNotification: jest.fn().mockRejectedValue(new Error("smtp down"))
    });
    const service = new OrdersService({
      logger,
      notificationService,
      ordersRepository: repository
    });

    await expect(service.updateOrderStatus(1, "delivered")).resolves.toEqual({
      ...order,
      status: "delivered"
    });
    expect(logger.error).toHaveBeenCalledWith({
      event: "delivered_order_notification_isolated_failure",
      orderId: 1,
      error: "smtp down"
    });
  });

  it("rejects unsupported order statuses", async () => {
    const service = createService();

    await expect(service.updateOrderStatus(1, "cancelled")).rejects.toBeInstanceOf(ValidationError);
  });

  it("requires a status when updating order status", async () => {
    const service = createService();

    await expect(service.updateOrderStatus(1)).rejects.toBeInstanceOf(ValidationError);
  });

  it("deletes an order", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.deleteOrder("1");

    expect(repository.deleteOrder).toHaveBeenCalledWith(1);
    expect(result).toEqual(order);
  });
});
