export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, code: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: unknown): ApiError {
  return new ApiError(400, message, "BAD_REQUEST", details);
}

export function unauthorized(message = "Authentication required"): ApiError {
  return new ApiError(401, message, "UNAUTHORIZED");
}

export function forbidden(message = "Not allowed"): ApiError {
  return new ApiError(403, message, "FORBIDDEN");
}

export function notFound(message = "Not found"): ApiError {
  return new ApiError(404, message, "NOT_FOUND");
}

export function conflict(message: string, details?: unknown): ApiError {
  return new ApiError(409, message, "CONFLICT", details);
}
