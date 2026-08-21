import { z } from "zod";
import type { Request, Response } from "express";
import { MAINTENANCE_STATUSES, MAINTENANCE_TYPES } from "@fleetify/shared";
import { MaintenanceRecord } from "../models/MaintenanceRecord.js";
import { Vehicle } from "../models/Vehicle.js";
import { Alert } from "../models/Alert.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/api-error.js";
import { allocateSlots, releaseSlots } from "../services/availabilityService.js";
import { evaluateVehicleMaintenance } from "../services/maintenanceService.js";
import { assertCalendarDate, todayInBusinessTz } from "../utils/dates.js";
import { routeParam } from "../utils/params.js";
import mongoose from "mongoose";

const recordSchema = z.object({
  vehicleId: z.string(),
  type: z.enum(MAINTENANCE_TYPES),
  servicedDate: z.string().optional(),
  odometerAtServiceKm: z.number().min(0).optional(),
  nextDueOdometerKm: z.number().min(0).optional(),
  nextDueDate: z.string().optional(),
  costCents: z.number().int().min(0).default(0),
  status: z.enum(MAINTENANCE_STATUSES).default("Pending"),
  notes: z.string().max(1000).optional(),
  isBlocking: z.boolean().optional(),
  blockStartDate: z.string().optional(),
  blockEndDate: z.string().optional(),
});

const vehicleSnapshot = {
  path: "vehicleId",
  select: "licensePlate make model year bodyType status currentOdometerKm inspectionExpiresAt",
};

export const listMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.vehicleId === "string") filter.vehicleId = req.query.vehicleId;
  if (typeof req.query.status === "string") filter.status = req.query.status;
  const records = await MaintenanceRecord.find(filter)
    .populate(vehicleSnapshot)
    .sort({ status: -1, nextDueDate: 1, createdAt: -1 });
  res.json({ records });
});

export const upcomingMaintenance = asyncHandler(async (_req: Request, res: Response) => {
  const today = todayInBusinessTz();
  const records = await MaintenanceRecord.find({
    status: "Pending",
  })
    .populate(vehicleSnapshot)
    .sort({ nextDueDate: 1 });
  res.json({ records, today });
});

export const createMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const body = recordSchema.parse(req.body);
  const vehicle = await Vehicle.findById(body.vehicleId);
  if (!vehicle) throw notFound("Vehicle not found");
  if (body.servicedDate) assertCalendarDate(body.servicedDate, "servicedDate");
  if (body.nextDueDate) assertCalendarDate(body.nextDueDate, "nextDueDate");

  const payload = {
    ...body,
    vehicleId: vehicle._id,
    odometerAtServiceKm:
      body.status === "Completed"
        ? (body.odometerAtServiceKm ?? vehicle.currentOdometerKm)
        : body.odometerAtServiceKm,
    servicedDate:
      body.status === "Completed"
        ? (body.servicedDate ?? todayInBusinessTz())
        : body.servicedDate,
  };

  const record = await MaintenanceRecord.create(payload);
  if (body.status === "Pending" && body.blockStartDate && body.blockEndDate) {
    await allocateSlots({
      vehicleId: vehicle._id,
      startDate: assertCalendarDate(body.blockStartDate),
      endDate: assertCalendarDate(body.blockEndDate),
      kind: "maintenance",
      sourceId: record._id,
    });
    if (body.isBlocking) {
      vehicle.status = "In Maintenance";
      await vehicle.save();
    }
  }
  if (body.status === "Completed") {
    await Alert.updateMany(
      { vehicleId: vehicle._id, category: "maintenance", isResolved: false },
      { $set: { isResolved: true } },
    );
    if (vehicle.status === "In Maintenance") {
      vehicle.status = "Available";
      await vehicle.save();
    }
    await evaluateVehicleMaintenance(vehicle);
  }
  res.status(201).json({ record });
});

export const updateMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const body = recordSchema.partial().parse(req.body);
  const record = await MaintenanceRecord.findById(routeParam(req.params.id));
  if (!record) throw notFound("Maintenance record not found");
  const vehicle = await Vehicle.findById(record.vehicleId);
  if (!vehicle) throw notFound("Vehicle not found");

  const becomingComplete = body.status === "Completed" && record.status !== "Completed";
  if (becomingComplete) {
    body.servicedDate = body.servicedDate ?? record.servicedDate ?? todayInBusinessTz();
    body.odometerAtServiceKm =
      body.odometerAtServiceKm ?? record.odometerAtServiceKm ?? vehicle.currentOdometerKm;
  }

  Object.assign(record, body);
  await record.save();
  if (record.status === "Completed") {
    await releaseSlots(record._id);
    await Alert.updateMany(
      { vehicleId: vehicle._id, category: "maintenance", isResolved: false },
      { $set: { isResolved: true } },
    );
    if (vehicle.status === "In Maintenance") {
      vehicle.status = "Available";
      await vehicle.save();
    }
    await evaluateVehicleMaintenance(vehicle);
  }
  res.json({ record });
});

export const deleteMaintenance = asyncHandler(async (req: Request, res: Response) => {
  const record = await MaintenanceRecord.findById(routeParam(req.params.id));
  if (!record) throw notFound("Maintenance record not found");
  await releaseSlots(new mongoose.Types.ObjectId(String(record._id)));
  await record.deleteOne();
  res.status(204).send();
});
