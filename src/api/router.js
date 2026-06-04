import { Router } from "express";

import healthRouter from "./routes/health.routes.js";
import { createOrdersRouter } from "./routes/orders.routes.js";

export function createApiRouter(dependencies) {
  const router = Router();

  router.use(healthRouter);
  router.use("/api/orders", createOrdersRouter(dependencies));

  return router;
}

export default createApiRouter;
