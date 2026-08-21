import mongoose from "mongoose";
import { Reservation } from "../models/Reservation.js";
import { Vehicle } from "../models/Vehicle.js";
import { Customer } from "../models/Customer.js";
import { Alert } from "../models/Alert.js";
import { badRequest, notFound } from "../utils/api-error.js";
import { releaseSlots } from "./availabilityService.js";
import { evaluateVehicleMaintenance } from "./maintenanceService.js";
import type { DamageMark, InspectionCheck } from "@fleetify/shared";
import { todayInBusinessTz } from "../utils/dates.js";

export async function completeRental(input: {
  reservationId: string;
  returnOdometerKm: number;
  returnFuelLevelPct: number;
  notes?: string;
  damage?: DamageMark[];
}): Promise<{ reservation: unknown; alertsCreated: number }> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const reservation = await Reservation.findById(input.reservationId).session(session);
    if (!reservation) throw notFound("Reservation not found");
    if (reservation.status !== "Active") {
      throw badRequest("Only active rentals can be completed");
    }
    if (input.returnOdometerKm < (reservation.pickupOdometerKm ?? 0)) {
      throw badRequest("Return odometer cannot be below pickup odometer");
    }

    const vehicle = await Vehicle.findById(reservation.vehicleId).session(session);
    if (!vehicle) throw notFound("Vehicle not found");

    const inspection: InspectionCheck = {
      kind: "return",
      recordedAt: new Date().toISOString(),
      odometerKm: input.returnOdometerKm,
      fuelLevelPct: input.returnFuelLevelPct,
      notes: input.notes ?? "",
      damage: input.damage ?? [],
    };
    reservation.inspectionChecks = [
      ...reservation.inspectionChecks.filter((check) => check.kind !== "return"),
      inspection,
    ];
    reservation.returnOdometerKm = input.returnOdometerKm;
    reservation.returnFuelLevelPct = input.returnFuelLevelPct;
    reservation.status = "Completed";
    await reservation.save({ session });

    vehicle.currentOdometerKm = input.returnOdometerKm;
    vehicle.fuelLevelPct = input.returnFuelLevelPct;
    vehicle.damageAreas = input.damage ?? vehicle.damageAreas;
    vehicle.status = "Available";
    await vehicle.save({ session });

    await releaseSlots(reservation._id, session);

    const late = reservation.endDate < todayInBusinessTz();
    const newDamage = (input.damage ?? []).length > 0;
    const customer = await Customer.findById(reservation.customerId).session(session);
    if (customer) {
      customer.rentalCount += 1;
      if (late) {
        customer.lateReturnCount += 1;
        customer.incidents.push({
          kind: "late_return",
          occurredAt: todayInBusinessTz(),
          amountCents: 0,
          notes: `Returned after ${reservation.endDate}`,
          isResolved: false,
        });
      }
      if (newDamage) {
        customer.incidents.push({
          kind: "vehicle_damage",
          occurredAt: todayInBusinessTz(),
          amountCents: 0,
          notes: `Return inspection logged ${(input.damage ?? []).length} damage mark(s)`,
          isResolved: false,
        });
      }
      await customer.save({ session });
    }

    const evaluation = await evaluateVehicleMaintenance(vehicle, session);
    await session.commitTransaction();
    return { reservation, alertsCreated: evaluation.alertsCreated };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export async function resolveAlert(key: string): Promise<void> {
  await Alert.updateOne({ key }, { $set: { isResolved: true } });
}
