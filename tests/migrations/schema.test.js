import { readFileSync } from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve(process.cwd(), "migrations");

function readMigration(fileName) {
  return readFileSync(path.join(migrationsDir, fileName), "utf8");
}

describe("orders migration", () => {
  const sql = readMigration("001_create_orders_table.sql");

  it("creates the orders table with the required columns", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS orders");
    expect(sql).toContain("id SERIAL PRIMARY KEY");
    expect(sql).toContain("customer_name VARCHAR(255) NOT NULL");
    expect(sql).toContain("product_name VARCHAR(255) NOT NULL");
    expect(sql).toContain(
      "updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP"
    );
  });

  it("limits order status to the supported values", () => {
    expect(sql).toContain("CHECK (status IN ('pending', 'shipped', 'delivered'))");
  });

  it("adds lookup indexes for common realtime filters", () => {
    expect(sql).toContain("idx_orders_customer_name");
    expect(sql).toContain("idx_orders_status");
    expect(sql).toContain("idx_orders_updated_at");
  });
});

describe("outbox migration", () => {
  const sql = readMigration("002_create_outbox_table.sql");

  it("creates the transactional outbox table", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS outbox_events");
    expect(sql).toContain("id UUID PRIMARY KEY DEFAULT gen_random_uuid()");
    expect(sql).toContain("payload JSONB NOT NULL");
    expect(sql).toContain("published_at TIMESTAMP WITHOUT TIME ZONE");
  });

  it("indexes unpublished events for the outbox processor", () => {
    expect(sql).toContain("idx_outbox_events_pending");
    expect(sql).toContain("WHERE published_at IS NULL");
  });
});

describe("orders updated_at trigger migration", () => {
  const sql = readMigration("003_add_orders_updated_at_trigger.sql");

  it("adds a trigger to keep updated_at fresh on updates", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION set_order_updated_at()");
    expect(sql).toContain("CREATE TRIGGER trg_orders_set_updated_at");
    expect(sql).toContain("BEFORE UPDATE ON orders");
  });
});
