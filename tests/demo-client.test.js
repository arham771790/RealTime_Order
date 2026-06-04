import request from "supertest";

import { createApp } from "../src/app.js";

describe("browser demo client", () => {
  it("serves the static Socket.IO demo page", async () => {
    const app = createApp();

    const response = await request(app).get("/demo.html");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Real-Time Orders Demo");
    expect(response.text).toContain("/socket.io/socket.io.js");
    expect(response.text).toContain("order:event");
  });
});
