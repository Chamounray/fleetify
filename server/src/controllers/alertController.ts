import type { Request, Response } from "express";
import { Alert } from "../models/Alert.js";
import { Vehicle } from "../models/Vehicle.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/api-error.js";
import { routeParam } from "../utils/params.js";

function serializeAlert(
  alert: InstanceType<typeof Alert>,
  vehicle?: { _id: unknown; licensePlate: string; make: string; model: string } | null,
) {
  const json = alert.toJSON() as Record<string, unknown>;
  return {
    ...json,
    vehicle: vehicle
      ? {
          _id: String(vehicle._id),
          licensePlate: vehicle.licensePlate,
          make: vehicle.make,
          model: vehicle.model,
        }
      : null,
  };
}

export const listAlerts = asyncHandler(async (req: Request, res: Response) => {
  const resolved = req.query.resolved === "true";
  const alerts = await Alert.find({ isResolved: resolved }).sort({ createdAt: -1 });
  const vehicleIds = alerts.map((alert) => alert.vehicleId).filter(Boolean);
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).select("licensePlate make model");
  const vehicleMap = new Map(vehicles.map((vehicle) => [String(vehicle._id), vehicle]));
  res.json({
    alerts: alerts.map((alert) =>
      serializeAlert(alert, alert.vehicleId ? vehicleMap.get(String(alert.vehicleId)) ?? null : null),
    ),
  });
});

export const resolveAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await Alert.findById(routeParam(req.params.id));
  if (!alert) throw notFound("Alert not found");
  alert.isResolved = true;
  await alert.save();
  const vehicle = alert.vehicleId
    ? await Vehicle.findById(alert.vehicleId).select("licensePlate make model")
    : null;
  res.json({ alert: serializeAlert(alert, vehicle) });
});
