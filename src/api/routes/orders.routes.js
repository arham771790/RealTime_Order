import { Router } from "express";

import { OrdersController } from "../controllers/orders.controller.js";
import { asyncHandler } from "../../utils/async-handler.js";

export function createOrdersRouter(dependencies) {
  const router = Router();
  const controller = new OrdersController(dependencies);

  router.get("/", asyncHandler(controller.listOrders));
  router.get("/:id", asyncHandler(controller.getOrder));
  router.post("/", asyncHandler(controller.createOrder));
  router.patch("/:id/status", asyncHandler(controller.updateOrderStatus));
  router.delete("/:id", asyncHandler(controller.deleteOrder));

  return router;
}
