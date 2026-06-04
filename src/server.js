import { createApp } from "./app.js";
import env from "./config/env.js";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`HTTP server listening on port ${env.port}`);
});

export default server;
