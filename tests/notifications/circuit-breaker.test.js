import { jest } from "@jest/globals";

import {
  CircuitBreaker,
  CircuitBreakerOpenError
} from "../../src/notifications/circuit-breaker.js";

describe("CircuitBreaker", () => {
  it("executes operations while closed", async () => {
    const circuitBreaker = new CircuitBreaker();
    const operation = jest.fn().mockResolvedValue("ok");

    await expect(circuitBreaker.execute(operation)).resolves.toBe("ok");

    expect(operation).toHaveBeenCalledTimes(1);
    expect(circuitBreaker.state).toBe("closed");
  });

  it("opens after the configured failure threshold", async () => {
    let now = 1000;
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      nowFn: () => now,
      resetTimeoutMs: 5000
    });
    const operation = jest.fn().mockRejectedValue(new Error("smtp down"));

    await expect(circuitBreaker.execute(operation)).rejects.toThrow("smtp down");
    await expect(circuitBreaker.execute(operation)).rejects.toThrow("smtp down");

    expect(circuitBreaker.state).toBe("open");
    await expect(circuitBreaker.execute(operation)).rejects.toBeInstanceOf(CircuitBreakerOpenError);

    now = 6000;
    operation.mockResolvedValueOnce("recovered");

    await expect(circuitBreaker.execute(operation)).resolves.toBe("recovered");
    expect(circuitBreaker.state).toBe("closed");
  });
});
