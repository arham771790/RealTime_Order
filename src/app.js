import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { createDependencies } from "./api/dependencies.js";
import { createApiRouter } from "./api/router.js";
import { corsMiddleware } from "./middleware/cors.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { createSecurityMiddleware } from "./middleware/security.js";

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");

export function createApp({ dependencies = createDependencies() } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(createSecurityMiddleware());
  app.use(corsMiddleware());
  app.use(express.json());
  app.use(requestLogger);
  app.use(express.static(publicDir));
  app.use(createApiRouter(dependencies));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
