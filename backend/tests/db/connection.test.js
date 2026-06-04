import { jest } from "@jest/globals";

import { connectWithRetry, verifyDatabaseConnection } from "../../src/db/connection.js";

function createLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

describe("verifyDatabaseConnection", () => {
  it("runs the database health query", async () => {
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] })
    };

    await verifyDatabaseConnection(pool);

    expect(pool.query).toHaveBeenCalledWith("SELECT 1");
  });
});

describe("connectWithRetry", () => {
  it("connects without retrying when the first check succeeds", async () => {
    const logger = createLogger();
    const pool = {
      query: jest.fn().mockResolvedValue({ rows: [] })
    };
    const sleepFn = jest.fn();

    await connectWithRetry(pool, { attempts: 3, delayMs: 10, logger, sleepFn });

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(sleepFn).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith({ event: "database_connected", attempt: 1 });
  });

  it("retries failed checks before succeeding", async () => {
    const logger = createLogger();
    const pool = {
      query: jest
        .fn()
        .mockRejectedValueOnce(new Error("database unavailable"))
        .mockResolvedValueOnce({ rows: [] })
    };
    const sleepFn = jest.fn().mockResolvedValue();

    await connectWithRetry(pool, { attempts: 3, delayMs: 25, logger, sleepFn });

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledWith(25);
    expect(logger.warn).toHaveBeenCalledWith({
      event: "database_connection_failed",
      attempt: 1,
      attempts: 3,
      error: "database unavailable"
    });
  });

  it("throws the final error after exhausting attempts", async () => {
    const logger = createLogger();
    const error = new Error("still down");
    const pool = {
      query: jest.fn().mockRejectedValue(error)
    };
    const sleepFn = jest.fn().mockResolvedValue();

    await expect(connectWithRetry(pool, { attempts: 2, delayMs: 5, logger, sleepFn })).rejects.toBe(
      error
    );

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(sleepFn).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith({
      event: "database_connection_exhausted",
      attempts: 2,
      error: "still down"
    });
  });
});
