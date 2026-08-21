import type { NextFunction, Response } from "express";
import type { Request } from "express";
import type { AdminRole } from "@fleetify/shared";
import { forbidden, unauthorized } from "../utils/api-error.js";
import { verifyAuthToken } from "../utils/jwt.js";

export type AuthedRequest = Request & {
  adminId?: string;
  adminEmail?: string;
  adminRole?: AdminRole;
};

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(unauthorized());
    return;
  }
  try {
    const payload = verifyAuthToken(header.slice(7));
    req.adminId = payload.sub;
    req.adminEmail = payload.email;
    req.adminRole = payload.role === ("admin" as AdminRole) ? "Admin" : payload.role;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function requireSuperAdmin(req: AuthedRequest, _res: Response, next: NextFunction): void {
  if (req.adminRole !== "SuperAdmin") {
    next(forbidden("Only the super admin can manage users"));
    return;
  }
  next();
}
