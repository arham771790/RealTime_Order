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

function createService(repository = createRepository()) {
  return new OrdersService({ ordersRepository: repository });
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

  it("rejects unsupported order statuses", async () => {
    const service = createService();

    await expect(service.updateOrderStatus(1, "cancelled")).rejects.toBeInstanceOf(ValidationError);
  });

  it("deletes an order", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.deleteOrder("1");

    expect(repository.deleteOrder).toHaveBeenCalledWith(1);
    expect(result).toEqual(order);
  });
});
