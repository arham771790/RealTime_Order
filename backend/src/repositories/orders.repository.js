import { withTransaction } from "../db/transaction.js";

function mapOrderRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    customerName: row.customer_name,
    productName: row.product_name,
    status: row.status,
    updatedAt: row.updated_at
  };
}

export class OrdersRepository {
  constructor({ outboxRepository, pool }) {
    if (!pool) {
      throw new Error("OrdersRepository requires a PostgreSQL pool.");
    }

    if (!outboxRepository) {
      throw new Error("OrdersRepository requires an outbox repository.");
    }

    this.pool = pool;
    this.outboxRepository = outboxRepository;
  }

  async createOrder({ customerName, productName, status }) {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query(
        `
          INSERT INTO orders (customer_name, product_name, status)
          VALUES ($1, $2, $3)
          RETURNING id, customer_name, product_name, status, updated_at
        `,
        [customerName, productName, status]
      );
      const order = mapOrderRow(result.rows[0]);

      await this.outboxRepository.createEvent(
        buildOrderOutboxEvent("order.created", order),
        client
      );

      return order;
    });
  }

  async getOrder(id) {
    const result = await this.pool.query(
      `
        SELECT id, customer_name, product_name, status, updated_at
        FROM orders
        WHERE id = $1
      `,
      [id]
    );

    return mapOrderRow(result.rows[0]);
  }

  async getOrders({ customerName, status, limit = 100, offset = 0 } = {}) {
    const conditions = [];
    const values = [];

    if (customerName) {
      values.push(`%${customerName}%`);
      conditions.push(`customer_name ILIKE $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }

    values.push(limit);
    const limitPlaceholder = `$${values.length}`;

    values.push(offset);
    const offsetPlaceholder = `$${values.length}`;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT id, customer_name, product_name, status, updated_at
        FROM orders
        ${whereClause}
        ORDER BY updated_at DESC, id DESC
        LIMIT ${limitPlaceholder}
        OFFSET ${offsetPlaceholder}
      `,
      values
    );

    return result.rows.map(mapOrderRow);
  }

  async updateOrder(id, { status }) {
    return withTransaction(this.pool, async (client) => {
      const existingResult = await client.query(
        `
          SELECT id, customer_name, product_name, status, updated_at
          FROM orders
          WHERE id = $1
          FOR UPDATE
        `,
        [id]
      );
      const previousOrder = mapOrderRow(existingResult.rows[0]);

      if (!previousOrder) {
        return null;
      }

      const result = await client.query(
        `
          UPDATE orders
          SET status = $2
          WHERE id = $1
          RETURNING id, customer_name, product_name, status, updated_at
        `,
        [id, status]
      );
      const order = mapOrderRow(result.rows[0]);

      await this.outboxRepository.createEvent(
        buildOrderOutboxEvent("order.status_updated", order, previousOrder),
        client
      );

      return order;
    });
  }

  async deleteOrder(id) {
    return withTransaction(this.pool, async (client) => {
      const result = await client.query(
        `
          DELETE FROM orders
          WHERE id = $1
          RETURNING id, customer_name, product_name, status, updated_at
        `,
        [id]
      );
      const order = mapOrderRow(result.rows[0]);

      if (!order) {
        return null;
      }

      await this.outboxRepository.createEvent(
        buildOrderOutboxEvent("order.deleted", null, order),
        client
      );

      return order;
    });
  }
}

function buildOrderOutboxEvent(eventType, currentOrder, previousOrder = null) {
  const order = currentOrder ?? previousOrder;
  const operationByEventType = {
    "order.created": "INSERT",
    "order.status_updated": "UPDATE",
    "order.deleted": "DELETE"
  };

  return {
    aggregateType: "order",
    aggregateId: String(order.id),
    eventType,
    payload: {
      operation: operationByEventType[eventType],
      table: "orders",
      orderId: order.id,
      old: previousOrder,
      new: currentOrder
    }
  };
}

export function createOrdersRepository(pool, outboxRepository) {
  return new OrdersRepository({ outboxRepository, pool });
}

export default OrdersRepository;
