import pool from "../db/pool.js";
import { OrdersRepository } from "../repositories/orders.repository.js";
import { OrdersService } from "../services/orders.service.js";

export function createDependencies({ dbPool = pool } = {}) {
  const ordersRepository = new OrdersRepository({ pool: dbPool });
  const ordersService = new OrdersService({ ordersRepository });

  return Object.freeze({
    ordersService
  });
}
