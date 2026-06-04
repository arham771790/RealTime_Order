import pg from "pg";

import env from "../config/env.js";

const { Pool } = pg;

export function buildPgPoolConfig(databaseConfig = env.database) {
  return {
    connectionString: databaseConfig.url,
    max: databaseConfig.poolMax,
    connectionTimeoutMillis: databaseConfig.connectionTimeoutMs,
    idleTimeoutMillis: databaseConfig.idleTimeoutMs,
    ssl: databaseConfig.ssl ? { rejectUnauthorized: false } : false
  };
}

export function createPgPool(databaseConfig = env.database) {
  return new Pool(buildPgPoolConfig(databaseConfig));
}

const pool = createPgPool();

export default pool;
