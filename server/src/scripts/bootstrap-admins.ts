/**
 * Creates production admin accounts with NO fleet seed data.
 * Reads credentials from env (never commit passwords).
 *
 * Required:
 *   MONGODB_URI
 *   BOOTSTRAP_SUPERADMIN_EMAIL
 *   BOOTSTRAP_SUPERADMIN_PASSWORD  (min 10 chars)
 *   BOOTSTRAP_ADMIN_EMAIL
 *   BOOTSTRAP_ADMIN_PASSWORD       (min 10 chars)
 *
 * Optional names:
 *   BOOTSTRAP_SUPERADMIN_NAME
 *   BOOTSTRAP_ADMIN_NAME
 */
import { connectDb, disconnectDb } from "../config/db.js";
import { Admin, ensureAdminRoles, hashPassword } from "../models/Admin.js";
import { normalizeEmail } from "../utils/text.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env ${name}`);
  return value;
}

async function upsertAdmin(input: {
  email: string;
  name: string;
  password: string;
  role: "SuperAdmin" | "Admin";
}): Promise<"created" | "updated"> {
  if (input.password.length < 10) {
    throw new Error(`Password for ${input.email} must be at least 10 characters`);
  }
  const email = normalizeEmail(input.email);
  const existing = await Admin.findOne({ email }).select("+passwordHash");
  const passwordHash = await hashPassword(input.password);
  if (!existing) {
    await Admin.create({
      email,
      name: input.name,
      role: input.role,
      passwordHash,
    });
    return "created";
  }
  existing.name = input.name;
  existing.role = input.role;
  existing.passwordHash = passwordHash;
  await existing.save();
  return "updated";
}

async function main(): Promise<void> {
  await connectDb();

  const superEmail = required("BOOTSTRAP_SUPERADMIN_EMAIL");
  const superPassword = required("BOOTSTRAP_SUPERADMIN_PASSWORD");
  const adminEmail = required("BOOTSTRAP_ADMIN_EMAIL");
  const adminPassword = required("BOOTSTRAP_ADMIN_PASSWORD");
  const superName = process.env.BOOTSTRAP_SUPERADMIN_NAME?.trim() || "Elie Barrak";
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Toni Geagea";

  if (normalizeEmail(superEmail) === normalizeEmail(adminEmail)) {
    throw new Error("Super admin and admin emails must be different");
  }

  // Ensure only these two production accounts exist when starting empty,
  // and force exact roles/passwords from env.
  const superResult = await upsertAdmin({
    email: superEmail,
    name: superName,
    password: superPassword,
    role: "SuperAdmin",
  });

  // Demote any other SuperAdmin so only the bootstrap super remains.
  await Admin.updateMany(
    { email: { $ne: normalizeEmail(superEmail) }, role: "SuperAdmin" },
    { $set: { role: "Admin" } },
  );

  const adminResult = await upsertAdmin({
    email: adminEmail,
    name: adminName,
    password: adminPassword,
    role: "Admin",
  });

  await ensureAdminRoles();

  const count = await Admin.countDocuments();
  console.log(`Bootstrap complete. Accounts in DB: ${count}`);
  console.log(`  SuperAdmin ${superEmail}: ${superResult}`);
  console.log(`  Admin ${adminEmail}: ${adminResult}`);
  console.log("No vehicles/customers/reservations were seeded.");

  await disconnectDb();
}

main().catch(async (error) => {
  console.error(error);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
