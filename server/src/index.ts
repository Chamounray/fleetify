import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { createApp } from "./app.js";
import { ensureAdminRoles } from "./models/Admin.js";
import { logFatal } from "./utils/logger.js";

async function main(): Promise<void> {
  await connectDb();
  await ensureAdminRoles();
  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Fleetify API listening on ${env.PORT}`);
    if (env.LOG_ERRORS !== "false") {
      console.log("HTTP errors are appended to server/logs/errors.log");
    }
  });
}

process.on("uncaughtException", (error) => {
  logFatal("Uncaught exception", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logFatal("Unhandled promise rejection", reason);
});

main().catch((error) => {
  logFatal("Server failed to start", error);
  process.exit(1);
});
