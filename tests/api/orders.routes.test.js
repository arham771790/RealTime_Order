import request from "supertest";
import { jest } from "@jest/globals";

import { createApp } from "../../src/app.js";
import { NotFoundError, ValidationError } from "../../src/utils/errors.js";

const order = {
  id: 1,
  customerName: "Ada Lovelace",
  productName: "Mechanical Keyboard",
  status: "pending",
  updatedAt: "2026-06-04T12:00:00.000Z"
};

function createOrdersService(overrides = {}) {
  return {
    getOrders: jest.fn().mockResolvedValue([order]),
    getOrder: jest.fn().mockResolvedValue(order),
    createOrder: jest.fn().mockResolvedValue(order),
    updateOrderStatus: jest.fn().mockResolvedValue({ ...order, status: "shipped" }),
    deleteOrder: jest.fn().mockResolvedValue(order),
    ...overrides
  };
}

function createTestApp(ordersService = createOrdersService()) {
  return createApp({
    dependencies: {
      ordersService
    }
  });
}

describe("orders REST API", () => {
  it("lists orders with query filters", async () => {
    const ordersService = createOrdersService();
    const app = createTestApp(ordersService);

    const response = await request(app)
      .get("/api/orders")
      .query({ customerName: "Ada", status: "pending", limit: "25", offset: "0" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [order] });
    expect(ordersService.getOrders).toHaveBeenCalledWith({
      customerName: "Ada",
      status: "pending",
      limit: "25",
      offset: "0"
    });
  });

  it("gets one order", async () => {
    const ordersService = createOrdersService();
    const app = createTestApp(ordersService);

    const response = await request(app).get("/api/orders/1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: order });
    expect(ordersService.getOrder).toHaveBeenCalledWith("1");
  });

  it("creates an order", async () => {
    const ordersService = createOrdersService();
    const app = createTestApp(ordersService);
    const body = {
      customerName: "Ada Lovelace",
      productName: "Mechanical Keyboard",
      status: "pending"
    };

    const response = await request(app).post("/api/orders").send(body);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ data: order });
    expect(ordersService.createOrder).toHaveBeenCalledWith(body);
  });

  it("updates order status", async () => {
    const ordersService = createOrdersService();
    const app = createTestApp(ordersService);

    const response = await request(app).patch("/api/orders/1/status").send({ status: "shipped" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("shipped");
    expect(ordersService.updateOrderStatus).toHaveBeenCalledWith("1", "shipped");
  });

  it("deletes an order", async () => {
    const ordersService = createOrdersService();
    const app = createTestApp(ordersService);

    const response = await request(app).delete("/api/orders/1");

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(ordersService.deleteOrder).toHaveBeenCalledWith("1");
  });

  it("returns validation errors from the service", async () => {
    const ordersService = createOrdersService({
      createOrder: jest.fn().mockRejectedValue(new ValidationError("customerName is required."))
    });
    const app = createTestApp(ordersService);

    const response = await request(app).post("/api/orders").send({ productName: "Keyboard" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        message: "customerName is required.",
        code: "VALIDATION_ERROR"
      }
    });
  });

  it("returns not found errors from the service", async () => {
    const ordersService = createOrdersService({
      getOrder: jest.fn().mockRejectedValue(new NotFoundError("Order 99 was not found."))
    });
    const app = createTestApp(ordersService);

    const response = await request(app).get("/api/orders/99");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        message: "Order 99 was not found.",
        code: "NOT_FOUND"
      }
    });
  });
});
