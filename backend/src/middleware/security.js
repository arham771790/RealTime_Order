import compression from "compression";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

import env from "../config/env.js";

export function createSecurityMiddleware({
  rateLimitMax = env.security.rateLimitMax,
  rateLimitWindowMs = env.security.rateLimitWindowMs
} = {}) {
  return [
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", env.socket.corsOrigin],
          imgSrc: ["'self'", "data:"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"]
        }
      }
    }),
    compression(),
    rateLimit({
      windowMs: rateLimitWindowMs,
      limit: rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false
    })
  ];
}

export default createSecurityMiddleware;
