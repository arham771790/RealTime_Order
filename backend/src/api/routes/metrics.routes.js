import { Router } from "express";

import { getPrometheusContentType, getPrometheusMetrics } from "../../metrics/prometheus.js";
import { getRuntimeMetrics } from "../../metrics/runtime-metrics.js";

const metricsRouter = Router();

metricsRouter.get("/metrics", async (_request, response) => {
  response.type(getPrometheusContentType()).send(await getPrometheusMetrics());
});

metricsRouter.get("/metrics/runtime", (_request, response) => {
  response.status(200).json(getRuntimeMetrics());
});

export default metricsRouter;
