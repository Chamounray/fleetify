import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(path.resolve(process.cwd(), "../.env"));
loadEnvFile(path.resolve(here, "../../.env"));
loadEnvFile(path.resolve(here, "../.env"));

if (process.env.VITEST === "true") {
  process.env.NODE_ENV ??= "test";
  process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/fleetify-test";
  process.env.JWT_SECRET ??= "test-jwt-secret-key";
  process.env.BUSINESS_TIMEZONE ??= "UTC";
  process.env.CLIENT_ORIGIN ??= "http://localhost:5173";
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),
  BUSINESS_TIMEZONE: z.string().min(1, "BUSINESS_TIMEZONE is required"),
  BUSINESS_NAME: z.string().default("Fleetify Local Fleet"),
  BUSINESS_ADDRESS: z.string().default("100 Harbor Yard"),
  CURRENCY: z.string().default("USD"),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(10).optional(),
  SEED_ON_START: z.enum(["true", "false"]).default("false"),
  LOG_DIR: z.string().optional(),
  LOG_ERRORS: z.enum(["true", "false"]).default("true"),
  /** When true, API also serves the Vite client build (Render single-service deploy). */
  SERVE_CLIENT: z.enum(["true", "false"]).default("false"),
  CLIENT_DIST: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid server environment: ${issues}`);
}

export const env = parsed.data;
