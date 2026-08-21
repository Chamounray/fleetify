import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";

export type ErrorLogEntry = {
  at: string;
  level: "error" | "warn" | "fatal";
  status?: number;
  code?: string;
  message: string;
  method?: string;
  path?: string;
  query?: Record<string, unknown>;
  adminId?: string;
  adminEmail?: string;
  ip?: string;
  userAgent?: string;
  durationMs?: number;
  details?: unknown;
  stack?: string;
};

const here = path.dirname(fileURLToPath(import.meta.url));

function todayStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function resolveLogDir(): string {
  if (env.LOG_DIR) return path.resolve(env.LOG_DIR);
  return path.resolve(here, "../../logs");
}

function ensureLogDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function formatLine(entry: ErrorLogEntry): string {
  const base = [
    entry.at,
    entry.level.toUpperCase(),
    entry.status ? `HTTP ${entry.status}` : "PROCESS",
    entry.code ?? "-",
    entry.method && entry.path ? `${entry.method} ${entry.path}` : "-",
    entry.message.replace(/\s+/g, " ").trim(),
  ].join(" | ");

  const extras: string[] = [];
  if (entry.adminEmail) extras.push(`admin=${entry.adminEmail}`);
  if (entry.adminId) extras.push(`adminId=${entry.adminId}`);
  if (entry.ip) extras.push(`ip=${entry.ip}`);
  if (entry.durationMs !== undefined) extras.push(`durationMs=${entry.durationMs}`);
  if (entry.query && Object.keys(entry.query).length) {
    extras.push(`query=${JSON.stringify(entry.query)}`);
  }
  if (entry.details !== undefined) {
    extras.push(`details=${safeJson(entry.details)}`);
  }
  if (entry.userAgent) extras.push(`ua=${entry.userAgent}`);
  if (entry.stack) extras.push(`stack=${entry.stack}`);

  return extras.length ? `${base} | ${extras.join(" | ")}\n` : `${base}\n`;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function shouldWriteFiles(): boolean {
  return env.NODE_ENV !== "test" && env.LOG_ERRORS !== "false";
}

/** Append HTTP / process errors to daily + rolling text logs under server/logs. */
export function logError(entry: Omit<ErrorLogEntry, "at"> & { at?: string }): void {
  const full: ErrorLogEntry = {
    at: entry.at ?? new Date().toISOString(),
    ...entry,
  };

  const line = formatLine(full);
  if (full.level === "fatal" || (full.status !== undefined && full.status >= 500)) {
    console.error(line.trimEnd());
  } else {
    console.warn(line.trimEnd());
  }

  if (!shouldWriteFiles()) return;

  try {
    const dir = resolveLogDir();
    ensureLogDir(dir);
    const daily = path.join(dir, `errors-${todayStamp()}.log`);
    const rolling = path.join(dir, "errors.log");
    fs.appendFileSync(daily, line, "utf8");
    fs.appendFileSync(rolling, line, "utf8");
  } catch (writeErr) {
    console.error("Failed to write error log file", writeErr);
  }
}

export function logFatal(message: string, err?: unknown): void {
  const error = err instanceof Error ? err : undefined;
  logError({
    level: "fatal",
    message: error ? `${message}: ${error.message}` : message,
    stack: error?.stack,
    details: error ? undefined : err,
  });
}
