import { connectDb, disconnectDb } from "../config/db.js";
import { env } from "../config/env.js";
import { Admin, hashPassword } from "../models/Admin.js";
import { Vehicle } from "../models/Vehicle.js";
import { Customer } from "../models/Customer.js";
import { Reservation } from "../models/Reservation.js";
import { Expense } from "../models/Expense.js";
import { MaintenanceRecord } from "../models/MaintenanceRecord.js";
import { Alert } from "../models/Alert.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { allocateSlots } from "../services/availabilityService.js";
import { evaluateVehicleMaintenance } from "../services/maintenanceService.js";
import { normalizePhone } from "../utils/text.js";

async function seed(): Promise<void> {
  await connectDb();
  const reset = process.argv.includes("--reset");
  if (reset) {
    await Promise.all([
      AvailabilitySlot.deleteMany({}),
      Reservation.deleteMany({}),
      MaintenanceRecord.deleteMany({}),
      Expense.deleteMany({}),
      Alert.deleteMany({}),
      Customer.deleteMany({}),
      Vehicle.deleteMany({}),
    ]);
    console.log("Seed reset: cleared fleet collections");
  }
  const email = env.SEED_ADMIN_EMAIL ?? "admin@fleetify.local";
  const password = env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!23";
  if ((await Admin.countDocuments()) === 0) {
    await Admin.create({
      email,
      name: "Amina Cole",
      role: "SuperAdmin",
      passwordHash: await hashPassword(password),
    });
  } else {
    const { ensureAdminRoles } = await import("../models/Admin.js");
    await ensureAdminRoles();
  }

  if ((await Vehicle.countDocuments()) > 0) {
    console.log("Seed skipped: fleet data already present");
    await disconnectDb();
    return;
  }

  const vehicles = await Vehicle.insertMany([
    {
      make: "Toyota",
      model: "Camry",
      year: 2022,
      bodyType: "Sedan",
      licensePlate: "FLT-101",
      dailyRateCents: 9800,
      currentOdometerKm: 18420,
      status: "Available",
      fuelLevelPct: 72,
      inspectionExpiresAt: new Date("2026-12-01"),
    },
    {
      make: "Honda",
      model: "CR-V",
      year: 2021,
      bodyType: "SUV",
      licensePlate: "FLT-204",
      dailyRateCents: 11200,
      currentOdometerKm: 24110,
      status: "Available",
      fuelLevelPct: 54,
      inspectionExpiresAt: new Date("2026-09-12"),
    },
    {
      make: "Hyundai",
      model: "Elantra",
      year: 2023,
      bodyType: "Sedan",
      licensePlate: "FLT-318",
      dailyRateCents: 7600,
      currentOdometerKm: 9100,
      status: "Available",
      fuelLevelPct: 88,
      inspectionExpiresAt: new Date("2027-01-20"),
    },
  ]);

  const customers = await Customer.insertMany([
    {
      name: "Lina Ortega",
      phone: "+1 (312) 847-1928",
      phoneKey: normalizePhone("+1 (312) 847-1928"),
      email: "lina.ortega@example.com",
      unpaidBalanceCents: 0,
    },
    {
      name: "Marcus Hale",
      phone: "4155550177",
      phoneKey: "4155550177",
      email: "marcus.hale@example.com",
      unpaidBalanceCents: 12500,
      rentalCount: 1,
      lateReturnCount: 1,
      incidents: [
        {
          kind: "unpaid_fine",
          occurredAt: "2026-07-11",
          amountCents: 12500,
          notes: "Late return fee still open",
          isResolved: false,
        },
      ],
    },
    {
      name: "Priya Shah",
      phone: "2065550144",
      phoneKey: "2065550144",
      isBlacklisted: true,
      blacklistReason: "Repeated unpaid damage claims",
    },
  ]);

  const booking = await Reservation.create({
    vehicleId: vehicles[0]._id,
    customerId: customers[0]._id,
    customerSnapshot: { name: customers[0].name, phone: customers[0].phone, email: customers[0].email },
    vehicleSnapshot: {
      make: vehicles[0].make,
      model: vehicles[0].model,
      year: vehicles[0].year,
      licensePlate: vehicles[0].licensePlate,
    },
    startDate: "2026-08-18",
    endDate: "2026-08-20",
    dailyRateCents: vehicles[0].dailyRateCents,
    expectedDistanceKm: 140,
    totalPriceCents: vehicles[0].dailyRateCents * 3,
    securityDepositCents: Math.round(vehicles[0].dailyRateCents * 3 * 0.2),
    status: "Confirmed",
  });
  await allocateSlots({
    vehicleId: vehicles[0]._id,
    startDate: booking.startDate,
    endDate: booking.endDate,
    kind: "reservation",
    sourceId: booking._id,
  });

  await Reservation.create({
    vehicleId: vehicles[2]._id,
    customerId: customers[1]._id,
    customerSnapshot: { name: customers[1].name, phone: customers[1].phone, email: customers[1].email },
    vehicleSnapshot: {
      make: vehicles[2].make,
      model: vehicles[2].model,
      year: vehicles[2].year,
      licensePlate: vehicles[2].licensePlate,
    },
    startDate: "2026-07-08",
    endDate: "2026-07-11",
    dailyRateCents: vehicles[2].dailyRateCents,
    expectedDistanceKm: 220,
    totalPriceCents: vehicles[2].dailyRateCents * 4,
    securityDepositCents: Math.round(vehicles[2].dailyRateCents * 4 * 0.2),
    status: "Completed",
    notes: "Returned a day late",
  });

  await MaintenanceRecord.create({
    vehicleId: vehicles[1]._id,
    type: "Oil Change",
    servicedDate: "2026-02-01",
    odometerAtServiceKm: 19000,
    nextDueOdometerKm: 24000,
    nextDueDate: "2026-08-01",
    costCents: 8900,
    status: "Completed",
  });
  await evaluateVehicleMaintenance(vehicles[1]);

  await Expense.create({
    vehicleId: vehicles[0]._id,
    category: "Insurance",
    date: "2026-08-01",
    amountCents: 18000,
    receiptLabel: "August policy",
  });

  console.log(`Seed complete. Admin ${email}`);
  await disconnectDb();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
