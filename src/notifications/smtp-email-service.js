import nodemailer from "nodemailer";

import env from "../config/env.js";
import { CircuitBreaker, CircuitBreakerOpenError } from "./circuit-breaker.js";

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createSmtpTransport(config = env.email.smtp) {
  const auth =
    config.user && config.password
      ? {
          user: config.user,
          pass: config.password
        }
      : undefined;

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth
  });
}

function buildDeliveredOrderMessage({ from, order, to }) {
  return {
    from,
    to,
    subject: `Order #${order.id} delivered`,
    text: [
      `Order #${order.id} has been delivered.`,
      `Customer: ${order.customerName}`,
      `Product: ${order.productName}`,
      `Updated at: ${order.updatedAt}`
    ].join("\n")
  };
}

export class SmtpEmailService {
  constructor({
    circuitBreaker,
    config = env.email,
    delayFn = delay,
    logger = console,
    transport
  } = {}) {
    this.circuitBreaker =
      circuitBreaker ??
      new CircuitBreaker({
        failureThreshold: config.circuitFailureThreshold,
        resetTimeoutMs: config.circuitResetTimeoutMs
      });
    this.config = config;
    this.delayFn = delayFn;
    this.logger = logger;
    this.transport = transport;
  }

  async sendDeliveredOrderNotification(order) {
    if (!this.config.enabled) {
      this.logger.info({
        event: "delivered_order_email_skipped",
        reason: "email_disabled",
        orderId: order.id
      });
      return { sent: false, reason: "email_disabled" };
    }

    const message = buildDeliveredOrderMessage({
      from: this.config.from,
      order,
      to: this.config.deliveredOrderNotificationTo
    });

    try {
      await this.circuitBreaker.execute(() => this.sendWithRetry(message));
      this.logger.info({ event: "delivered_order_email_sent", orderId: order.id });

      return { sent: true };
    } catch (error) {
      this.logger.error({
        event: "delivered_order_email_failed",
        orderId: order.id,
        error: error.message,
        circuitOpen: error instanceof CircuitBreakerOpenError
      });

      return { sent: false, error };
    }
  }

  async sendWithRetry(message) {
    let lastError;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt += 1) {
      try {
        await this.getTransport().sendMail(message);
        return;
      } catch (error) {
        lastError = error;

        if (attempt < this.config.retryAttempts) {
          await this.delayFn(this.config.retryDelayMs);
        }
      }
    }

    throw lastError;
  }

  getTransport() {
    if (!this.transport) {
      this.transport = createSmtpTransport(this.config.smtp);
    }

    return this.transport;
  }
}

export default SmtpEmailService;
