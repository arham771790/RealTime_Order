import request from "supertest";

import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns an ok status payload", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("sets security headers", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });
});

describe("GET /ready", () => {
  it("returns a readiness payload", async () => {
    const app = createApp();

    const response = await request(app).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });
});

describe("GET /metrics", () => {
  it("returns runtime metrics", async () => {
    const app = createApp();

    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        pid: expect.any(Number),
        uptimeSeconds: expect.any(Number),
        memory: expect.objectContaining({
          rss: expect.any(Number),
          heapUsed: expect.any(Number)
        })
      })
    );
  });
});

describe("unknown routes", () => {
  it("returns a structured 404 response", async () => {
    const app = createApp();

    const response = await request(app).get("/missing-route");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        message: "Route not found: GET /missing-route",
        code: "ROUTE_NOT_FOUND"
      }
    });
  });
});

describe("CORS", () => {
  it("responds to preflight requests", async () => {
    const app = createApp();

    const response = await request(app).options("/api/orders");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-methods"]).toContain("PATCH");
  });
});
