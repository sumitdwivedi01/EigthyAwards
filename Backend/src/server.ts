import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { db } from "./lib/db.js";
import { logger } from "./lib/logger.js";
import { mailer } from "./lib/mailer/index.js";
import { startEmailDispatcher } from "./modules/notifications/dispatcher.js";

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "API listening");
});

// Sends queued emails (the EmailLog outbox) every 10 seconds.
const stopDispatcher = startEmailDispatcher({ db, mailer, intervalMs: 10_000 });

function shutdown(signal: string): void {
  logger.info({ signal }, "shutting down");
  stopDispatcher();
  server.close(() => {
    db.$disconnect().finally(() => process.exit(0));
  });
  // Don't hang forever if a connection refuses to close.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
