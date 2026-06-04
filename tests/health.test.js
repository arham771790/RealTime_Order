import request from "supertest";

import { createApp } from "../src/app.js";

describe("GET /health", () => {
  it("returns an ok status payload", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
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
