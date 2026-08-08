import { createApp } from "./app";
import { env } from "./config/env";
import { pool } from "./lib/db";

const app = createApp();

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`ERP/CRM API listening on port ${env.port} [${env.nodeEnv}]`);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
