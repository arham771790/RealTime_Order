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

function createOutboxRepository() {
  return {
    createEvent: jest.fn().mockResolvedValue({})
  };
}

function createTransactionPool(results) {
  const pendingResults = [...results];
  const client = {
    query: jest.fn(async (query) => {
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        return { rows: [] };
      }

      return pendingResults.shift() ?? { rows: [] };
    }),
    release: jest.fn()
  };

  return {
    pool: {
      connect: jest.fn().mockResolvedValue(client)
    },
    client
  };
}

function createRepository(pool = createPool(), outboxRepository = createOutboxRepository()) {
  return new OrdersRepository({ outboxRepository, pool });
}

describe("OrdersRepository", () => {
  it("requires a PostgreSQL pool", () => {
    expect(() => new OrdersRepository({ outboxRepository: createOutboxRepository() })).toThrow(
      "OrdersRepository requires a PostgreSQL pool."
    );
  });

  it("requires an outbox repository", () => {
    expect(() => new OrdersRepository({ pool: createPool() })).toThrow(
      "OrdersRepository requires an outbox repository."
    );
  });

  it("creates an order and an outbox event in one transaction", async () => {
    const { pool, client } = createTransactionPool([{ rows: [orderRow] }]);
    const outboxRepository = createOutboxRepository();
    const repository = createRepository(pool, outboxRepository);

    const order = await repository.createOrder({
      customerName: "Ada Lovelace",
      productName: "Mechanical Keyboard",
      status: "pending"
    });

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO orders"), [
      "Ada Lovelace",
      "Mechanical Keyboard",
      "pending"
    ]);
    expect(outboxRepository.createEvent).toHaveBeenCalledTimes(1);
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(order).toEqual({
      id: 42,
      customerName: "Ada Lovelace",
      productName: "Mechanical Keyboard",
      status: "pending",
      updatedAt: "2026-06-04T12:00:00.000Z"
    });
  });

  it("writes the create outbox payload with the created order snapshot", async () => {
    const { pool, client } = createTransactionPool([{ rows: [orderRow] }]);
    const outboxRepository = createOutboxRepository();
    const repository = createRepository(pool, outboxRepository);

    await repository.createOrder({
      customerName: "Ada Lovelace",
      productName: "Mechanical Keyboard",
      status: "pending"
    });

    expect(outboxRepository.createEvent).toHaveBeenCalledWith(
      {
        aggregateType: "order",
        aggregateId: "42",
        eventType: "order.created",
        payload: {
          operation: "INSERT",
          table: "orders",
          orderId: 42,
          old: null,
          new: {
            id: 42,
            customerName: "Ada Lovelace",
            productName: "Mechanical Keyboard",
            status: "pending",
            updatedAt: "2026-06-04T12:00:00.000Z"
          }
        }
      },
      client
    );
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
    const updatedRow = { ...orderRow, status: "shipped" };
    const { pool, client } = createTransactionPool([{ rows: [orderRow] }, { rows: [updatedRow] }]);
    const outboxRepository = createOutboxRepository();
    const repository = createRepository(pool, outboxRepository);

    const order = await repository.updateOrder(42, { status: "shipped" });

    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("FOR UPDATE"), [42]);
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("UPDATE orders"), [
      42,
      "shipped"
    ]);
    expect(outboxRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: "42",
        eventType: "order.status_updated",
        payload: expect.objectContaining({
          operation: "UPDATE",
          old: expect.objectContaining({ status: "pending" }),
          new: expect.objectContaining({ status: "shipped" })
        })
      }),
      client
    );
    expect(order.status).toBe("shipped");
  });

  it("does not write an update outbox event when the order does not exist", async () => {
    const { pool } = createTransactionPool([{ rows: [] }]);
    const outboxRepository = createOutboxRepository();
    const repository = createRepository(pool, outboxRepository);

    const order = await repository.updateOrder(404, { status: "shipped" });

    expect(order).toBeNull();
    expect(outboxRepository.createEvent).not.toHaveBeenCalled();
  });

  it("deletes an order", async () => {
    const { pool, client } = createTransactionPool([{ rows: [orderRow] }]);
    const outboxRepository = createOutboxRepository();
    const repository = createRepository(pool, outboxRepository);

    const order = await repository.deleteOrder(42);

    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM orders"), [42]);
    expect(outboxRepository.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: "42",
        eventType: "order.deleted",
        payload: expect.objectContaining({
          operation: "DELETE",
          old: expect.objectContaining({ id: 42 }),
          new: null
        })
      }),
      client
    );
    expect(order.id).toBe(42);
  });
});
