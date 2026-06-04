import express from "express";

import apiRouter from "./api/router.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(requestLogger);
  app.use(apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
