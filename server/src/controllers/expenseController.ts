import { z } from "zod";
import type { Request, Response } from "express";
import { EXPENSE_CATEGORIES } from "@fleetify/shared";
import { Expense } from "../models/Expense.js";
import { Vehicle } from "../models/Vehicle.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/api-error.js";
import { assertCalendarDate } from "../utils/dates.js";
import { routeParam } from "../utils/params.js";

const expenseSchema = z.object({
  vehicleId: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  date: z.string(),
  amountCents: z.number().int().positive(),
  notes: z.string().max(1000).optional(),
  receiptLabel: z.string().max(120).optional(),
});

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const filter: Record<string, unknown> = {};
  if (typeof req.query.vehicleId === "string") filter.vehicleId = req.query.vehicleId;
  const expenses = await Expense.find(filter).sort({ date: -1 });
  res.json({ expenses });
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const body = expenseSchema.parse(req.body);
  if (body.vehicleId) {
    const vehicle = await Vehicle.findById(body.vehicleId);
    if (!vehicle) throw notFound("Vehicle not found");
  }
  const expense = await Expense.create({
    ...body,
    date: assertCalendarDate(body.date),
  });
  res.status(201).json({ expense });
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findById(routeParam(req.params.id));
  if (!expense) throw notFound("Expense not found");
  await expense.deleteOne();
  res.status(204).send();
});
