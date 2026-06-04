export function registerDatabaseShutdown({
  pool,
  logger = console,
  processRef = process,
  shutdownTasks = [],
  signals = ["SIGINT", "SIGTERM"]
} = {}) {
  if (!pool) {
    throw new Error("A PostgreSQL pool is required to register database shutdown hooks.");
  }

  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info({ event: "database_shutdown_started", signal });

    try {
      for (const shutdownTask of shutdownTasks) {
        await shutdownTask.handler();
        logger.info({
          event: "shutdown_task_completed",
          name: shutdownTask.name,
          signal
        });
      }

      await pool.end();
      logger.info({ event: "database_shutdown_completed", signal });
    } catch (error) {
      logger.error({ event: "database_shutdown_failed", signal, error: error.message });
      processRef.exitCode = 1;
    }
  }

  for (const signal of signals) {
    processRef.once(signal, shutdown);
  }

  return function unregisterDatabaseShutdown() {
    for (const signal of signals) {
      processRef.off(signal, shutdown);
    }
  };
}
