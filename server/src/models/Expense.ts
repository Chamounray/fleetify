import mongoose, { Schema } from "mongoose";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@fleetify/shared";

export type ExpenseDocument = mongoose.Document & {
  vehicleId?: mongoose.Types.ObjectId;
  category: ExpenseCategory;
  date: string;
  amountCents: number;
  notes: string;
  receiptLabel: string;
};

const expenseSchema = new Schema<ExpenseDocument>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    amountCents: { type: Number, required: true, min: 1 },
    notes: { type: String, default: "", maxlength: 1000 },
    receiptLabel: { type: String, default: "", maxlength: 120 },
  },
  { timestamps: true },
);

export const Expense = mongoose.model<ExpenseDocument>("Expense", expenseSchema);
