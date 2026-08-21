import { z } from "zod";
import type { Request, Response } from "express";
import { DAMAGE_SEVERITIES, DAMAGE_TYPES, DAMAGE_ZONES } from "@fleetify/shared";
import { Reservation } from "../models/Reservation.js";
import { Vehicle } from "../models/Vehicle.js";
import { Customer } from "../models/Customer.js";
import { asyncHandler } from "../utils/async-handler.js";
import { badRequest, forbidden, notFound } from "../utils/api-error.js";
import { allocateSlots, releaseSlots, replaceSlots } from "../services/availabilityService.js";
import { customerWarning } from "../services/customerWarning.js";
import { assertCalendarDate, rentalDayCount, todayInBusinessTz } from "../utils/dates.js";
import { computeDeposit, computeRentalTotal } from "../utils/money.js";
import { completeRental } from "../services/rentalCompletionService.js";
import { routeParam } from "../utils/params.js";
import { runInTransaction } from "../utils/session.js";

const damageSchema = z.object({
  zone: z.enum(DAMAGE_ZONES),
  type: z.enum(DAMAGE_TYPES),
  severity: z.enum(DAMAGE_SEVERITIES),
  notes: z.string().max(500).default(""),
});

const createSchema = z.object({
  vehicleId: z.string(),
  customerId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  expectedDistanceKm: z.number().min(0),
  dailyRateCents: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
  customerWarningAcknowledged: z.boolean().optional(),
});

export const listReservations = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === "string") filter.status = req.query.status;
  if (typeof req.query.vehicleId === "string") filter.vehicleId = req.query.vehicleId;
  if (req.query.dueToday === "true") {
    filter.endDate = todayInBusinessTz();
    filter.status = { $in: ["Confirmed", "Active"] };
  }
  const reservations = await Reservation.find(filter).sort({ startDate: 1 });
  res.json({ reservations });
});

export const getReservation = asyncHandler(async (req: Request, res: Response) => {
  const reservation = await Reservation.findById(routeParam(req.params.id));
  if (!reservation) throw notFound("Reservation not found");
  const vehicle = await Vehicle.findById(reservation.vehicleId).select("dailyRateCents");
  res.json({
    reservation,
    vehicleDailyRateCents: vehicle?.dailyRateCents ?? reservation.dailyRateCents,
  });
});

export const createReservation = asyncHandler(async (req: Request, res: Response) => {
  const body = createSchema.parse(req.body);
  const startDate = assertCalendarDate(body.startDate, "startDate");
  const endDate = assertCalendarDate(body.endDate, "endDate");
  const vehicle = await Vehicle.findById(body.vehicleId);
  const customer = await Customer.findById(body.customerId);
  if (!vehicle) throw notFound("Vehicle not found");
  if (!customer) throw notFound("Customer not found");
  if (vehicle.status === "Out of Service") throw badRequest("Vehicle is out of service");

  const warning = customerWarning(customer);
  if (warning.isBlacklisted) {
    throw forbidden("Customer is blacklisted");
  }
  if (warning.requiresAcknowledgement && !body.customerWarningAcknowledged) {
    throw badRequest("Customer warning must be acknowledged", { warning });
  }

  const days = rentalDayCount(startDate, endDate);
  const dailyRateCents = body.dailyRateCents ?? vehicle.dailyRateCents;
  const totalPriceCents = computeRentalTotal(dailyRateCents, days);
  const reservation = await runInTransaction(async (session) => {
    const [created] = await Reservation.create(
      [
        {
          vehicleId: vehicle._id,
          customerId: customer._id,
          customerSnapshot: { name: customer.name, phone: customer.phone, email: customer.email },
          vehicleSnapshot: {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            licensePlate: vehicle.licensePlate,
          },
          startDate,
          endDate,
          dailyRateCents,
          expectedDistanceKm: body.expectedDistanceKm,
          totalPriceCents,
          securityDepositCents: computeDeposit(totalPriceCents),
          status: "Confirmed",
          customerWarningAcknowledged: Boolean(body.customerWarningAcknowledged),
          notes: body.notes ?? "",
        },
      ],
      { session },
    );
    await allocateSlots({
      vehicleId: vehicle._id,
      startDate,
      endDate,
      kind: "reservation",
      sourceId: created._id,
      session,
    });
    return created;
  });

  res.status(201).json({ reservation, warning });
});

export const updateReservation = asyncHandler(async (req: Request, res: Response) => {
  const body = createSchema.partial().parse(req.body);
  const reservation = await runInTransaction(async (session) => {
    const current = await Reservation.findById(routeParam(req.params.id)).session(session);
    if (!current) throw notFound("Reservation not found");
    if (current.status !== "Confirmed") {
      throw badRequest("Only confirmed reservations can be edited");
    }
    const startDate = assertCalendarDate(body.startDate ?? current.startDate, "startDate");
    const endDate = assertCalendarDate(body.endDate ?? current.endDate, "endDate");
    current.startDate = startDate;
    current.endDate = endDate;
    if (body.expectedDistanceKm !== undefined) current.expectedDistanceKm = body.expectedDistanceKm;
    if (body.notes !== undefined) current.notes = body.notes;
    if (body.dailyRateCents !== undefined) current.dailyRateCents = body.dailyRateCents;
    const days = rentalDayCount(startDate, endDate);
    current.totalPriceCents = computeRentalTotal(current.dailyRateCents, days);
    current.securityDepositCents = computeDeposit(current.totalPriceCents);
    await replaceSlots({
      vehicleId: current.vehicleId,
      startDate,
      endDate,
      kind: "reservation",
      sourceId: current._id,
      session,
    });
    await current.save({ session });
    return current;
  });
  res.json({ reservation });
});

export const cancelReservation = asyncHandler(async (req: Request, res: Response) => {
  const reservation = await Reservation.findById(routeParam(req.params.id));
  if (!reservation) throw notFound("Reservation not found");
  if (reservation.status === "Completed") throw badRequest("Completed rentals cannot be canceled");
  reservation.status = "Canceled";
  await reservation.save();
  await releaseSlots(reservation._id);
  const vehicle = await Vehicle.findById(reservation.vehicleId);
  if (vehicle && vehicle.status === "Booked") {
    vehicle.status = "Available";
    await vehicle.save();
  }
  res.json({ reservation });
});

export const activateReservation = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      pickupOdometerKm: z.number().min(0),
      pickupFuelLevelPct: z.number().min(0).max(100),
      notes: z.string().max(1000).optional(),
      damage: z.array(damageSchema).default([]),
    })
    .parse(req.body);
  const reservation = await Reservation.findById(routeParam(req.params.id));
  if (!reservation) throw notFound("Reservation not found");
  if (reservation.status !== "Confirmed") throw badRequest("Only confirmed reservations can be activated");
  const vehicle = await Vehicle.findById(reservation.vehicleId);
  if (!vehicle) throw notFound("Vehicle not found");
  if (body.pickupOdometerKm < vehicle.currentOdometerKm) {
    throw badRequest("Pickup odometer cannot be below current vehicle odometer");
  }
  reservation.status = "Active";
  reservation.pickupOdometerKm = body.pickupOdometerKm;
  reservation.pickupFuelLevelPct = body.pickupFuelLevelPct;
  reservation.inspectionChecks = [
    {
      kind: "pickup",
      recordedAt: new Date().toISOString(),
      odometerKm: body.pickupOdometerKm,
      fuelLevelPct: body.pickupFuelLevelPct,
      notes: body.notes ?? "",
      damage: body.damage,
    },
  ];
  await reservation.save();
  vehicle.status = "Booked";
  vehicle.currentOdometerKm = body.pickupOdometerKm;
  vehicle.fuelLevelPct = body.pickupFuelLevelPct;
  if (body.damage.length) vehicle.damageAreas = body.damage;
  await vehicle.save();
  res.json({ reservation });
});

export const completeReservation = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      returnOdometerKm: z.number().min(0),
      returnFuelLevelPct: z.number().min(0).max(100),
      notes: z.string().max(1000).optional(),
      damage: z.array(damageSchema).default([]),
    })
    .parse(req.body);
  const result = await completeRental({
    reservationId: routeParam(req.params.id),
    ...body,
  });
  res.json(result);
});

export const timeline = asyncHandler(async (req: Request, res: Response) => {
  const startDate = assertCalendarDate(String(req.query.startDate ?? todayInBusinessTz()), "startDate");
  const endDate = assertCalendarDate(String(req.query.endDate ?? startDate), "endDate");
  const vehicles = await Vehicle.find().sort({ licensePlate: 1 });
  const reservations = await Reservation.find({
    status: { $in: ["Confirmed", "Active"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  const { AvailabilitySlot } = await import("../models/AvailabilitySlot.js");
  const slots = await AvailabilitySlot.find({
    date: { $gte: startDate, $lte: endDate },
  });
  res.json({ startDate, endDate, vehicles, reservations, slots });
});
