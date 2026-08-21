import { z } from "zod";
import type { Request, Response } from "express";
import { Admin, hashPassword } from "../models/Admin.js";
import { conflict, unauthorized } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { signAuthToken } from "../utils/jwt.js";
import { normalizeEmail } from "../utils/text.js";
import { runInTransaction } from "../utils/session.js";
import type { AuthedRequest } from "../middleware/auth.js";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10).max(72),
  name: z.string().min(2).max(80).optional(),
});

function publicAdmin(admin: { _id: unknown; email: string; name: string; role: string }) {
  return { id: admin._id, email: admin.email, name: admin.name, role: admin.role };
}

export const getSetupStatus = asyncHandler(async (_req: Request, res: Response) => {
  const count = await Admin.countDocuments();
  res.json({ setupRequired: count === 0 });
});

export const setup = asyncHandler(async (req: Request, res: Response) => {
  const body = credentialsSchema.parse(req.body);
  const created = await runInTransaction(async (session) => {
    const count = await Admin.countDocuments().session(session);
    if (count > 0) {
      throw conflict("Admin setup is already complete");
    }
    const docs = await Admin.create(
      [
        {
          email: normalizeEmail(body.email),
          name: body.name ?? "Fleet Admin",
          role: "SuperAdmin",
          passwordHash: await hashPassword(body.password),
        },
      ],
      { session },
    );
    const admin = Array.isArray(docs) ? docs[0] : docs;
    if (!admin) throw conflict("Admin setup failed");
    return admin;
  });
  const token = signAuthToken({
    sub: String(created._id),
    email: created.email,
    role: created.role,
  });
  res.status(201).json({
    token,
    admin: publicAdmin(created),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const body = credentialsSchema.pick({ email: true, password: true }).parse(req.body);
  const admin = await Admin.findOne({ email: normalizeEmail(body.email) }).select("+passwordHash");
  if (!admin || !(await admin.comparePassword(body.password))) {
    throw unauthorized("Invalid email or password");
  }
  const token = signAuthToken({
    sub: String(admin._id),
    email: admin.email,
    role: admin.role,
  });
  res.json({
    token,
    admin: publicAdmin(admin),
  });
});

export const me = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const admin = await Admin.findById(req.adminId);
  if (!admin) throw unauthorized();
  res.json({ admin: publicAdmin(admin) });
});
