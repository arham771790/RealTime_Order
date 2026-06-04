const DEFAULT_HEALTH_QUERY = "SELECT 1";

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function verifyDatabaseConnection(pool, { query = DEFAULT_HEALTH_QUERY } = {}) {
  await pool.query(query);
}

export async function connectWithRetry(
  pool,
  { attempts, delayMs, logger = console, sleepFn = sleep } = {}
) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await verifyDatabaseConnection(pool);
      logger.info({ event: "database_connected", attempt });
      return;
    } catch (error) {
      lastError = error;
      logger.warn({ event: "database_connection_failed", attempt, attempts, error: error.message });

      if (attempt < attempts) {
        await sleepFn(delayMs);
      }
    }
  }

  logger.error({ event: "database_connection_exhausted", attempts, error: lastError.message });
  throw lastError;
}
