import { z } from "zod";
import type { Response } from "express";
import { ADMIN_ROLES } from "@fleetify/shared";
import { Admin, hashPassword } from "../models/Admin.js";
import { asyncHandler } from "../utils/async-handler.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/api-error.js";
import { normalizeEmail } from "../utils/text.js";
import { routeParam } from "../utils/params.js";
import type { AuthedRequest } from "../middleware/auth.js";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(10).max(72),
  role: z.enum(ADMIN_ROLES).default("Admin"),
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(80).optional(),
  password: z.string().min(10).max(72).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
});

function publicAdmin(admin: {
  _id: unknown;
  email: string;
  name: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(admin._id),
    email: admin.email,
    name: admin.name,
    role: admin.role,
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

async function superAdminCount(excludeId?: string): Promise<number> {
  const filter: Record<string, unknown> = { role: "SuperAdmin" };
  if (excludeId) filter._id = { $ne: excludeId };
  return Admin.countDocuments(filter);
}

export const listAdmins = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const admins = await Admin.find().sort({ role: -1, name: 1 });
  res.json({ admins: admins.map(publicAdmin) });
});

export const createAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = createSchema.parse(req.body);
  if (body.role === "SuperAdmin") {
    throw forbidden("Additional super admins cannot be created. Promote from an existing Admin if needed.");
  }
  const email = normalizeEmail(body.email);
  const exists = await Admin.exists({ email });
  if (exists) throw conflict("An account with that email already exists");

  const admin = await Admin.create({
    email,
    name: body.name,
    role: "Admin",
    passwordHash: await hashPassword(body.password),
  });
  res.status(201).json({ admin: publicAdmin(admin) });
});

export const updateAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = updateSchema.parse(req.body);
  const id = routeParam(req.params.id);
  const admin = await Admin.findById(id);
  if (!admin) throw notFound("User not found");

  const isSelf = String(admin._id) === req.adminId;

  if (body.role && body.role !== admin.role) {
    if (isSelf) throw forbidden("You cannot change your own role");
    if (body.role === "SuperAdmin") {
      throw forbidden("There can only be one super admin");
    }
    if (admin.role === "SuperAdmin" && body.role === "Admin") {
      throw forbidden("The super admin cannot be demoted");
    }
    admin.role = body.role;
  }

  if (body.email) {
    const email = normalizeEmail(body.email);
    const clash = await Admin.exists({ email, _id: { $ne: admin._id } });
    if (clash) throw conflict("An account with that email already exists");
    admin.email = email;
  }
  if (body.name) admin.name = body.name;
  if (body.password) {
    if (!body.password.trim()) throw badRequest("Password cannot be empty");
    admin.passwordHash = await hashPassword(body.password);
  }

  await admin.save();
  res.json({ admin: publicAdmin(admin) });
});

export const deleteAdmin = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const id = routeParam(req.params.id);
  if (id === req.adminId) throw forbidden("You cannot delete your own account");

  const admin = await Admin.findById(id);
  if (!admin) throw notFound("User not found");

  if (admin.role === "SuperAdmin") {
    const remaining = await superAdminCount(String(admin._id));
    if (remaining < 1) throw forbidden("Cannot delete the last super admin");
  }

  await admin.deleteOne();
  res.status(204).send();
});
