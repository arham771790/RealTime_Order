import pool from "../db/pool.js";
import { SmtpEmailService } from "../notifications/smtp-email-service.js";
import { OutboxRepository } from "../outbox/outbox.repository.js";
import { OrdersRepository } from "../repositories/orders.repository.js";
import { OrdersService } from "../services/orders.service.js";

export function createDependencies({ dbPool = pool } = {}) {
  const outboxRepository = new OutboxRepository({ pool: dbPool });
  const ordersRepository = new OrdersRepository({ outboxRepository, pool: dbPool });
  const notificationService = new SmtpEmailService();
  const ordersService = new OrdersService({ notificationService, ordersRepository });

  return Object.freeze({
    ordersService
  });
}
