import { getRuntimeMetrics } from "../../src/metrics/runtime-metrics.js";

describe("getRuntimeMetrics", () => {
  it("returns process runtime details", () => {
    const metrics = getRuntimeMetrics({
      memoryUsage: {
        arrayBuffers: 5,
        external: 4,
        heapTotal: 3,
        heapUsed: 2,
        rss: 1
      },
      now: new Date("2026-06-04T12:00:00.000Z").getTime(),
      pid: 123,
      uptimeSeconds: 45
    });

    expect(metrics).toEqual({
      pid: 123,
      uptimeSeconds: 45,
      startedAt: expect.any(String),
      timestamp: "2026-06-04T12:00:00.000Z",
      memory: {
        arrayBuffers: 5,
        external: 4,
        heapTotal: 3,
        heapUsed: 2,
        rss: 1
      }
    });
  });
});
