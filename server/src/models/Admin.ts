import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { ADMIN_ROLES, type AdminRole } from "@fleetify/shared";
import { normalizeEmail } from "../utils/text.js";

export type AdminDocument = mongoose.Document & {
  email: string;
  name: string;
  role: AdminRole;
  passwordHash: string;
  comparePassword: (plain: string) => Promise<boolean>;
};

const adminSchema = new Schema<AdminDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      set: normalizeEmail,
    },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    role: { type: String, enum: ADMIN_ROLES, default: "Admin", index: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

adminSchema.methods.comparePassword = async function comparePassword(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/** Promote first account and normalize legacy role values. */
export async function ensureAdminRoles(): Promise<void> {
  await Admin.updateMany({ role: "admin" as unknown as AdminRole }, { $set: { role: "Admin" } });
  const superCount = await Admin.countDocuments({ role: "SuperAdmin" });
  if (superCount === 0) {
    const first = await Admin.findOne().sort({ createdAt: 1 });
    if (first) {
      first.role = "SuperAdmin";
      await first.save();
    }
  }
}

export const Admin = mongoose.model<AdminDocument>("Admin", adminSchema);
