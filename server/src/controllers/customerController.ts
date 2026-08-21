import { z } from "zod";
import type { Request, Response } from "express";
import { Customer } from "../models/Customer.js";
import { Reservation } from "../models/Reservation.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/api-error.js";
import { normalizePhone } from "../utils/text.js";
import { customerWarning } from "../services/customerWarning.js";
import { rentalDayCount, todayInBusinessTz } from "../utils/dates.js";
import { routeParam } from "../utils/params.js";

const customerSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(7).max(20),
  email: z.string().email().or(z.literal("")).optional(),
  unpaidBalanceCents: z.number().int().min(0).optional(),
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const flagged = req.query.flagged === "true";
  const clauses: Record<string, unknown>[] = [];
  if (q) {
    clauses.push({
      $or: [
        { name: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
        { phoneKey: normalizePhone(q) },
        { email: new RegExp(q, "i") },
      ],
    });
  }
  if (flagged) {
    clauses.push({
      $or: [
        { isBlacklisted: true },
        { unpaidBalanceCents: { $gt: 0 } },
        { incidents: { $elemMatch: { isResolved: false } } },
      ],
    });
  }
  const filter = clauses.length ? { $and: clauses } : {};
  const customers = await Customer.find(filter).sort({ name: 1 });
  res.json({
    customers: customers.map((customer) => ({
      ...customer.toJSON(),
      warning: customerWarning(customer),
    })),
  });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findById(routeParam(req.params.id));
  if (!customer) throw notFound("Customer not found");
  const history = await Reservation.find({ customerId: customer._id }).sort({ startDate: -1 });
  res.json({
    customer,
    warning: customerWarning(customer),
    history: history.map((reservation) => ({
      ...reservation.toJSON(),
      durationDays: rentalDayCount(reservation.startDate, reservation.endDate),
      vehicle: reservation.vehicleSnapshot,
    })),
  });
});

export const lookupCustomer = asyncHandler(async (req: Request, res: Response) => {
  const phone = typeof req.query.phone === "string" ? req.query.phone : "";
  const customer = await Customer.findOne({ phoneKey: normalizePhone(phone) });
  if (!customer) throw notFound("Customer not found");
  res.json({ customer, warning: customerWarning(customer) });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const body = customerSchema.parse(req.body);
  const customer = await Customer.create({
    ...body,
    phoneKey: normalizePhone(body.phone),
  });
  res.status(201).json({ customer, warning: customerWarning(customer) });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const body = customerSchema.partial().extend({
    isBlacklisted: z.boolean().optional(),
    blacklistReason: z.string().max(500).optional(),
  }).parse(req.body);
  const customer = await Customer.findById(routeParam(req.params.id));
  if (!customer) throw notFound("Customer not found");
  Object.assign(customer, body);
  await customer.save();
  res.json({ customer, warning: customerWarning(customer) });
});

export const addIncident = asyncHandler(async (req: Request, res: Response) => {
  const body = z
    .object({
      kind: z.enum(["late_return", "unpaid_fine", "vehicle_damage", "other"]),
      amountCents: z.number().int().min(0).default(0),
      notes: z.string().min(2).max(1000),
    })
    .parse(req.body);
  const customer = await Customer.findById(routeParam(req.params.id));
  if (!customer) throw notFound("Customer not found");
  customer.incidents.push({
    ...body,
    occurredAt: todayInBusinessTz(),
    isResolved: false,
  });
  if (body.kind === "unpaid_fine") {
    customer.unpaidBalanceCents += body.amountCents;
  }
  await customer.save();
  res.status(201).json({ customer, warning: customerWarning(customer) });
});

export const resolveIncident = asyncHandler(async (req: Request, res: Response) => {
  const customer = await Customer.findById(routeParam(req.params.id));
  if (!customer) throw notFound("Customer not found");
  const incident = customer.incidents.find((item) => String(item._id) === routeParam(req.params.incidentId, "incidentId"));
  if (!incident) throw notFound("Incident not found");
  incident.isResolved = true;
  await customer.save();
  res.json({ customer, warning: customerWarning(customer) });
});
