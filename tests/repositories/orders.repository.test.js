import { jest } from "@jest/globals";

import { OrdersRepository } from "../../src/repositories/orders.repository.js";

const orderRow = {
  id: 42,
  customer_name: "Ada Lovelace",
  product_name: "Mechanical Keyboard",
  status: "pending",
  updated_at: "2026-06-04T12:00:00.000Z"
};

function createPool(rows = [orderRow]) {
  return {
    query: jest.fn().mockResolvedValue({ rows })
  };
}

function createRepository(pool = createPool()) {
  return new OrdersRepository({ pool });
}

describe("OrdersRepository", () => {
  it("requires a PostgreSQL pool", () => {
    expect(() => new OrdersRepository({})).toThrow("OrdersRepository requires a PostgreSQL pool.");
  });

  it("creates an order", async () => {
    const pool = createPool();
    const repository = createRepository(pool);

    const order = await repository.createOrder({
      customerName: "Ada Lovelace",
      productName: "Mechanical Keyboard",
      status: "pending"
    });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO orders"), [
      "Ada Lovelace",
      "Mechanical Keyboard",
      "pending"
    ]);
    expect(order).toEqual({
      id: 42,
      customerName: "Ada Lovelace",
      productName: "Mechanical Keyboard",
      status: "pending",
      updatedAt: "2026-06-04T12:00:00.000Z"
    });
  });

  it("gets a single order by id", async () => {
    const pool = createPool();
    const repository = createRepository(pool);

    const order = await repository.getOrder(42);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("WHERE id = $1"), [42]);
    expect(order.id).toBe(42);
  });

  it("returns null when a single order does not exist", async () => {
    const repository = createRepository(createPool([]));

    await expect(repository.getOrder(999)).resolves.toBeNull();
  });

  it("lists orders with customer and status filters", async () => {
    const pool = createPool();
    const repository = createRepository(pool);

    const orders = await repository.getOrders({
      customerName: "Ada",
      status: "pending",
      limit: 25,
      offset: 10
    });

    const [query, values] = pool.query.mock.calls[0];

    expect(query).toContain("customer_name ILIKE $1");
    expect(query).toContain("status = $2");
    expect(query).toContain("LIMIT $3");
    expect(query).toContain("OFFSET $4");
    expect(values).toEqual(["%Ada%", "pending", 25, 10]);
    expect(orders).toHaveLength(1);
  });

  it("updates order status", async () => {
    const pool = createPool([{ ...orderRow, status: "shipped" }]);
    const repository = createRepository(pool);

    const order = await repository.updateOrder(42, { status: "shipped" });

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE orders"), [
      42,
      "shipped"
    ]);
    expect(order.status).toBe("shipped");
  });

  it("deletes an order", async () => {
    const pool = createPool();
    const repository = createRepository(pool);

    const order = await repository.deleteOrder(42);

    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM orders"), [42]);
    expect(order.id).toBe(42);
  });
});
