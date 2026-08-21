import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error.js";
import { logError } from "../utils/logger.js";
import type { AuthedRequest } from "./auth.js";

type ErrorResponseBody = {
  message: string;
  code: string;
  details?: unknown;
  stack?: string;
};

function isDuplicateKey(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: number }).code === 11000);
}

function duplicateDetails(err: unknown): unknown {
  if (err && typeof err === "object" && "keyValue" in err) {
    return (err as { keyValue?: unknown }).keyValue;
  }
  return undefined;
}

function requestMeta(req: Request) {
  const authed = req as AuthedRequest;
  return {
    method: req.method,
    path: req.originalUrl.split("?")[0] || req.path,
    query: req.query as Record<string, unknown>,
    adminId: authed.adminId,
    adminEmail: authed.adminEmail,
    ip: req.ip || req.socket.remoteAddress,
    userAgent: req.get("user-agent") ?? undefined,
  };
}

function writeHttpError(
  req: Request,
  status: number,
  body: ErrorResponseBody,
  err?: unknown,
): void {
  const error = err instanceof Error ? err : undefined;
  logError({
    level: status >= 500 ? "error" : "warn",
    status,
    code: body.code,
    message: body.message,
    details: body.details,
    stack: status >= 500 ? (error?.stack ?? body.stack) : undefined,
    ...requestMeta(req),
  });
}

/** Logs every finished response with status >= 400 (covers 404 route misses too). */
export function httpErrorLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on("finish", () => {
    if (res.statusCode < 400) return;
    const locals = res.locals as { errorLog?: ErrorResponseBody };
    if (locals.errorLog) return; // already logged in errorHandler / notFoundHandler with richer detail
    logError({
      level: res.statusCode >= 500 ? "error" : "warn",
      status: res.statusCode,
      code: "HTTP_ERROR",
      message: `Request completed with status ${res.statusCode}`,
      durationMs: Date.now() - started,
      ...requestMeta(req),
    });
  });
  next();
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ErrorResponseBody = { message: "Route not found", code: "NOT_FOUND" };
  writeHttpError(req, 404, body);
  res.locals.errorLog = body;
  res.status(404).json({ error: body });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let body: ErrorResponseBody = {
    message: "Internal server error",
    code: "INTERNAL",
  };

  if (err instanceof ApiError) {
    status = err.statusCode;
    body = { message: err.message, code: err.code, details: err.details };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      message: "Validation failed",
      code: "BAD_REQUEST",
      details: err.flatten(),
    };
  } else if (err instanceof SyntaxError) {
    status = 400;
    body = { message: "Invalid JSON body", code: "BAD_REQUEST" };
  } else if (isDuplicateKey(err)) {
    status = 409;
    body = {
      message: "Duplicate record",
      code: "CONFLICT",
      details: duplicateDetails(err),
    };
  } else {
    const mongooseErr = err as { name?: string; message?: string };
    if (mongooseErr.name === "ValidationError") {
      status = 400;
      body = {
        message: mongooseErr.message ?? "Validation failed",
        code: "BAD_REQUEST",
      };
    } else if (err instanceof Error) {
      body = {
        message: "Internal server error",
        code: "INTERNAL",
        stack: err.stack,
      };
    }
  }

  writeHttpError(req, status, body, err);
  res.locals.errorLog = body;

  const payload =
    status >= 500
      ? { error: { message: body.message, code: body.code } }
      : { error: { message: body.message, code: body.code, details: body.details } };

  res.status(status).json(payload);
}
