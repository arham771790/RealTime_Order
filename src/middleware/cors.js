import env from "../config/env.js";

const DEFAULT_ALLOWED_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const DEFAULT_ALLOWED_HEADERS = "Content-Type";

export function corsMiddleware({
  allowedHeaders = DEFAULT_ALLOWED_HEADERS,
  allowedMethods = DEFAULT_ALLOWED_METHODS,
  origin = env.socket.corsOrigin
} = {}) {
  return (request, response, next) => {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Methods", allowedMethods);
    response.setHeader("Access-Control-Allow-Headers", allowedHeaders);

    if (request.method === "OPTIONS") {
      response.status(204).send();
      return;
    }

    next();
  };
}

export default corsMiddleware;
