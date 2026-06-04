const startedAt = Date.now();

export function getRuntimeMetrics({
  memoryUsage = process.memoryUsage(),
  now = Date.now(),
  pid = process.pid,
  uptimeSeconds = process.uptime()
} = {}) {
  return {
    pid,
    uptimeSeconds,
    startedAt: new Date(startedAt).toISOString(),
    timestamp: new Date(now).toISOString(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
      arrayBuffers: memoryUsage.arrayBuffers
    }
  };
}

export default getRuntimeMetrics;
