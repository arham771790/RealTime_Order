import dotenv from "dotenv";

const VALID_NODE_ENVS = new Set(["development", "test", "production"]);
const DEFAULT_NODE_ENV = "development";
const DEFAULT_PORT = 3000;

dotenv.config();

function parseNodeEnv(rawNodeEnv) {
  const nodeEnv = rawNodeEnv ?? DEFAULT_NODE_ENV;

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${nodeEnv}". Expected one of: ${Array.from(VALID_NODE_ENVS).join(", ")}.`
    );
  }

  return nodeEnv;
}

function parsePort(rawPort) {
  if (rawPort === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number.parseInt(rawPort, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid PORT "${rawPort}". PORT must be a positive integer.`);
  }

  return port;
}

export const env = Object.freeze({
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  port: parsePort(process.env.PORT)
});

export default env;
