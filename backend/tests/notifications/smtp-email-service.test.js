import { jest } from "@jest/globals";

import { CircuitBreaker } from "../../src/notifications/circuit-breaker.js";
import { SmtpEmailService } from "../../src/notifications/smtp-email-service.js";

const order = {
  id: 42,
  customerName: "Ada Lovelace",
  productName: "Mechanical Keyboard",
  status: "delivered",
  updatedAt: "2026-06-04T12:00:00.000Z"
};

const enabledConfig = {
  enabled: true,
  from: "orders@example.com",
  deliveredOrderNotificationTo: "ops@example.com",
  retryAttempts: 2,
  retryDelayMs: 10,
  circuitFailureThreshold: 2,
  circuitResetTimeoutMs: 30000,
  smtp: {
    host: "localhost",
    port: 1025,
    secure: false
  }
};

function createLogger() {
  return {
    error: jest.fn(),
    info: jest.fn()
  };
}

function createTransport() {
  return {
    sendMail: jest.fn().mockResolvedValue({ messageId: "message-1" })
  };
}

describe("SmtpEmailService", () => {
  it("skips sending when email notifications are disabled", async () => {
    const logger = createLogger();
    const transport = createTransport();
    const service = new SmtpEmailService({
      config: { ...enabledConfig, enabled: false },
      logger,
      transport
    });

    const result = await service.sendDeliveredOrderNotification(order);

    expect(result).toEqual({ sent: false, reason: "email_disabled" });
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it("sends a delivered order email", async () => {
    const transport = createTransport();
    const service = new SmtpEmailService({ config: enabledConfig, transport });

    const result = await service.sendDeliveredOrderNotification(order);

    expect(result).toEqual({ sent: true });
    expect(transport.sendMail).toHaveBeenCalledWith({
      from: "orders@example.com",
      to: "ops@example.com",
      subject: "Order #42 delivered",
      text: expect.stringContaining("Order #42 has been delivered.")
    });
  });

  it("retries failed SMTP sends before succeeding", async () => {
    const transport = createTransport();
    const delayFn = jest.fn().mockResolvedValue();
    transport.sendMail.mockRejectedValueOnce(new Error("temporary smtp failure"));
    const service = new SmtpEmailService({ config: enabledConfig, delayFn, transport });

    const result = await service.sendDeliveredOrderNotification(order);

    expect(result).toEqual({ sent: true });
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    expect(delayFn).toHaveBeenCalledWith(10);
  });

  it("isolates SMTP failures and opens the circuit", async () => {
    const transport = createTransport();
    const logger = createLogger();
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 30000 });
    transport.sendMail.mockRejectedValue(new Error("smtp down"));
    const service = new SmtpEmailService({
      circuitBreaker,
      config: { ...enabledConfig, retryAttempts: 1 },
      logger,
      transport
    });

    const result = await service.sendDeliveredOrderNotification(order);
    const secondResult = await service.sendDeliveredOrderNotification(order);

    expect(result.sent).toBe(false);
    expect(secondResult.sent).toBe(false);
    expect(circuitBreaker.state).toBe("open");
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "delivered_order_email_failed",
        orderId: 42
      })
    );
  });
});
