import { Router } from "express";

import { getRuntimeMetrics } from "../../metrics/runtime-metrics.js";

const metricsRouter = Router();

metricsRouter.get("/metrics", (_request, response) => {
  response.status(200).json(getRuntimeMetrics());
});

export default metricsRouter;
