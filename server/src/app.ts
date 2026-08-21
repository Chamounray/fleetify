import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler, httpErrorLogger, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/authRoutes.js";
import { vehicleRouter } from "./routes/vehicleRoutes.js";
import { maintenanceRouter } from "./routes/maintenanceRoutes.js";
import { customerRouter } from "./routes/customerRoutes.js";
import { reservationRouter } from "./routes/reservationRoutes.js";
import { expenseRouter } from "./routes/expenseRoutes.js";
import { dashboardRouter } from "./routes/dashboardRoutes.js";
import { documentRouter } from "./routes/documentRoutes.js";
import { alertRouter } from "./routes/alertRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function resolveClientDist(): string | null {
  if (env.SERVE_CLIENT !== "true") return null;
  const candidates = [
    env.CLIENT_DIST,
    path.resolve(process.cwd(), "client/dist"),
    path.resolve(process.cwd(), "../client/dist"),
    path.resolve(here, "../../client/dist"),
    path.resolve(here, "../../../client/dist"),
  ].filter(Boolean) as string[];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return null;
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(httpErrorLogger);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/admins", requireAuth, adminRouter);
  app.use("/api/vehicles", requireAuth, vehicleRouter);
  app.use("/api/maintenance", requireAuth, maintenanceRouter);
  app.use("/api/customers", requireAuth, customerRouter);
  app.use("/api/reservations", requireAuth, reservationRouter);
  app.use("/api/expenses", requireAuth, expenseRouter);
  app.use("/api/dashboard", requireAuth, dashboardRouter);
  app.use("/api/alerts", requireAuth, alertRouter);
  app.use("/api/documents", requireAuth, documentRouter);

  const clientDist = resolveClientDist();
  if (clientDist) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    app.use(notFoundHandler);
  }

  app.use(errorHandler);
  return app;
}
