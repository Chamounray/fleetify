import mongoose, { Schema } from "mongoose";
import { ALERT_CATEGORIES, type AlertCategory } from "@fleetify/shared";

export type AlertDocument = mongoose.Document & {
  vehicleId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  category: AlertCategory;
  key: string;
  severity: "info" | "warning" | "urgent";
  message: string;
  isResolved: boolean;
  dueOdometerKm?: number;
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
};

const alertSchema = new Schema<AlertDocument>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    category: { type: String, enum: ALERT_CATEGORIES, required: true },
    key: { type: String, required: true, unique: true },
    severity: { type: String, enum: ["info", "warning", "urgent"], default: "warning" },
    message: { type: String, required: true, maxlength: 500 },
    isResolved: { type: Boolean, default: false, index: true },
    dueOdometerKm: { type: Number, min: 0 },
    dueDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  },
  { timestamps: true },
);

export const Alert = mongoose.model<AlertDocument>("Alert", alertSchema);
