import { EventEmitter } from "node:events";

import { jest } from "@jest/globals";

import { registerDatabaseShutdown } from "../../src/db/shutdown.js";

function createLogger() {
  return {
    info: jest.fn(),
    error: jest.fn()
  };
}

function createProcessRef() {
  const processRef = new EventEmitter();
  processRef.exitCode = 0;
  return processRef;
}

function waitForEventLoop() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

describe("registerDatabaseShutdown", () => {
  it("closes the pool when a shutdown signal is received", async () => {
    const pool = {
      end: jest.fn().mockResolvedValue()
    };
    const logger = createLogger();
    const processRef = createProcessRef();

    registerDatabaseShutdown({ pool, logger, processRef, signals: ["SIGTERM"] });
    processRef.emit("SIGTERM", "SIGTERM");
    await waitForEventLoop();

    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith({
      event: "database_shutdown_completed",
      signal: "SIGTERM"
    });
  });

  it("does not run shutdown more than once", async () => {
    const pool = {
      end: jest.fn().mockResolvedValue()
    };
    const logger = createLogger();
    const processRef = createProcessRef();

    registerDatabaseShutdown({ pool, logger, processRef, signals: ["SIGINT", "SIGTERM"] });
    processRef.emit("SIGINT", "SIGINT");
    processRef.emit("SIGTERM", "SIGTERM");
    await waitForEventLoop();

    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it("sets a failing exit code when pool shutdown fails", async () => {
    const pool = {
      end: jest.fn().mockRejectedValue(new Error("close failed"))
    };
    const logger = createLogger();
    const processRef = createProcessRef();

    registerDatabaseShutdown({ pool, logger, processRef, signals: ["SIGTERM"] });
    processRef.emit("SIGTERM", "SIGTERM");
    await waitForEventLoop();

    expect(processRef.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalledWith({
      event: "database_shutdown_failed",
      signal: "SIGTERM",
      error: "close failed"
    });
  });

  it("can unregister shutdown listeners", () => {
    const pool = {
      end: jest.fn()
    };
    const logger = createLogger();
    const processRef = createProcessRef();

    const unregister = registerDatabaseShutdown({ pool, logger, processRef, signals: ["SIGTERM"] });
    unregister();
    processRef.emit("SIGTERM", "SIGTERM");

    expect(pool.end).not.toHaveBeenCalled();
  });
});
