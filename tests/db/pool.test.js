import { buildPgPoolConfig } from "../../src/db/pool.js";

describe("buildPgPoolConfig", () => {
  it("maps app database config to pg pool options", () => {
    const config = buildPgPoolConfig({
      url: "postgresql://user:pass@localhost:5432/orders",
      poolMax: 20,
      connectionTimeoutMs: 1500,
      idleTimeoutMs: 45000,
      ssl: true
    });

    expect(config).toEqual({
      connectionString: "postgresql://user:pass@localhost:5432/orders",
      max: 20,
      connectionTimeoutMillis: 1500,
      idleTimeoutMillis: 45000,
      ssl: { rejectUnauthorized: false }
    });
  });

  it("disables ssl when the app config does not request it", () => {
    const config = buildPgPoolConfig({
      url: "postgresql://user:pass@localhost:5432/orders",
      poolMax: 5,
      connectionTimeoutMs: 1000,
      idleTimeoutMs: 10000,
      ssl: false
    });

    expect(config.ssl).toBe(false);
  });
});
