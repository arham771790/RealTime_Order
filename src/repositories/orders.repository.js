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
  constructor({ pool }) {
    if (!pool) {
      throw new Error("OrdersRepository requires a PostgreSQL pool.");
    }

    this.pool = pool;
  }

  async createOrder({ customerName, productName, status }) {
    const result = await this.pool.query(
      `
        INSERT INTO orders (customer_name, product_name, status)
        VALUES ($1, $2, $3)
        RETURNING id, customer_name, product_name, status, updated_at
      `,
      [customerName, productName, status]
    );

    return mapOrderRow(result.rows[0]);
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
    const result = await this.pool.query(
      `
        UPDATE orders
        SET status = $2
        WHERE id = $1
        RETURNING id, customer_name, product_name, status, updated_at
      `,
      [id, status]
    );

    return mapOrderRow(result.rows[0]);
  }

  async deleteOrder(id) {
    const result = await this.pool.query(
      `
        DELETE FROM orders
        WHERE id = $1
        RETURNING id, customer_name, product_name, status, updated_at
      `,
      [id]
    );

    return mapOrderRow(result.rows[0]);
  }
}

export function createOrdersRepository(pool) {
  return new OrdersRepository({ pool });
}

export default OrdersRepository;
