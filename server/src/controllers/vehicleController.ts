import { z } from "zod";
import type { Request, Response } from "express";
import { MAINTENANCE_TYPES, VEHICLE_BODY_TYPES, VEHICLE_STATUSES } from "@fleetify/shared";
import { Vehicle } from "../models/Vehicle.js";
import { Reservation } from "../models/Reservation.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { asyncHandler } from "../utils/async-handler.js";
import { badRequest, conflict, notFound } from "../utils/api-error.js";
import { normalizePlate } from "../utils/text.js";
import { evaluateVehicleMaintenance } from "../services/maintenanceService.js";
import { routeParam } from "../utils/params.js";
import { assertCalendarDate } from "../utils/dates.js";

const vehicleSchema = z.object({
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  year: z.number().int().min(1990),
  bodyType: z.enum(VEHICLE_BODY_TYPES).default("Sedan"),
  licensePlate: z.string().min(3).max(12),
  dailyRateCents: z.number().int().positive(),
  currentOdometerKm: z.number().min(0),
  status: z.enum(VEHICLE_STATUSES).optional(),
  fuelLevelPct: z.number().min(0).max(100),
  inspectionExpiresAt: z.string().datetime(),
  notes: z.string().max(1000).optional(),
  maintenanceRules: z
    .array(
      z.object({
        type: z.enum(MAINTENANCE_TYPES),
        intervalKm: z.number().min(0),
        intervalDays: z.number().min(0),
        isBlocking: z.boolean(),
      }),
    )
    .optional(),
});

export const listVehicles = asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const bodyType = typeof req.query.type === "string" ? req.query.type : undefined;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (bodyType) {
    if (!(VEHICLE_BODY_TYPES as readonly string[]).includes(bodyType)) {
      throw badRequest("type must be a known vehicle body type");
    }
    filter.bodyType = bodyType;
  }
  if (q) {
    filter.$or = [
      { make: new RegExp(q, "i") },
      { model: new RegExp(q, "i") },
      { licensePlate: new RegExp(q, "i") },
    ];
  }
  const vehicles = await Vehicle.find(filter).sort({ licensePlate: 1 });
  res.json({ vehicles });
});

export const listAvailableVehicles = asyncHandler(async (req: Request, res: Response) => {
  const startDate = assertCalendarDate(String(req.query.startDate ?? ""), "startDate");
  const endDate = assertCalendarDate(String(req.query.endDate ?? ""), "endDate");
  if (endDate < startDate) throw badRequest("endDate must be on or after startDate");
  const bodyType = typeof req.query.type === "string" && req.query.type ? req.query.type : undefined;
  if (bodyType && !(VEHICLE_BODY_TYPES as readonly string[]).includes(bodyType)) {
    throw badRequest("type must be a known vehicle body type");
  }

  const filter: Record<string, unknown> = {
    status: { $nin: ["Out of Service", "In Maintenance"] },
  };
  if (bodyType) filter.bodyType = bodyType;

  const [vehicles, busyIds] = await Promise.all([
    Vehicle.find(filter).sort({ licensePlate: 1 }),
    AvailabilitySlot.distinct("vehicleId", {
      date: { $gte: startDate, $lte: endDate },
    }),
  ]);
  const busy = new Set(busyIds.map(String));
  const available = vehicles.filter((vehicle) => !busy.has(String(vehicle._id)));
  res.json({
    startDate,
    endDate,
    type: bodyType ?? null,
    count: available.length,
    vehicles: available,
  });
});

export const getVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(routeParam(req.params.id));
  if (!vehicle) throw notFound("Vehicle not found");
  res.json({ vehicle });
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const body = vehicleSchema.parse(req.body);
  const vehicle = await Vehicle.create({
    ...body,
    licensePlate: normalizePlate(body.licensePlate),
    inspectionExpiresAt: new Date(body.inspectionExpiresAt),
  });
  await evaluateVehicleMaintenance(vehicle);
  res.status(201).json({ vehicle });
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const body = vehicleSchema.partial().parse(req.body);
  const vehicle = await Vehicle.findById(routeParam(req.params.id));
  if (!vehicle) throw notFound("Vehicle not found");
  if (body.licensePlate) body.licensePlate = normalizePlate(body.licensePlate);
  if (body.inspectionExpiresAt) {
    vehicle.inspectionExpiresAt = new Date(body.inspectionExpiresAt);
    delete body.inspectionExpiresAt;
  }
  Object.assign(vehicle, body);
  await vehicle.save();
  await evaluateVehicleMaintenance(vehicle);
  res.json({ vehicle });
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(routeParam(req.params.id));
  if (!vehicle) throw notFound("Vehicle not found");
  const blocking = await Reservation.exists({
    vehicleId: vehicle._id,
    status: { $in: ["Confirmed", "Active"] },
  });
  if (blocking) {
    throw conflict("Cannot delete a vehicle with confirmed or active reservations");
  }
  await vehicle.deleteOne();
  res.status(204).send();
});

export const evaluateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const vehicle = await Vehicle.findById(routeParam(req.params.id));
  if (!vehicle) throw notFound("Vehicle not found");
  if (typeof req.body?.currentOdometerKm === "number") {
    if (req.body.currentOdometerKm < vehicle.currentOdometerKm) {
      throw badRequest("Odometer cannot decrease");
    }
    vehicle.currentOdometerKm = req.body.currentOdometerKm;
    await vehicle.save();
  }
  const result = await evaluateVehicleMaintenance(vehicle);
  res.json({ vehicle, ...result });
});
