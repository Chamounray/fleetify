import mongoose, { Schema } from "mongoose";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  type MaintenanceStatus,
  type MaintenanceType,
} from "@fleetify/shared";

export type MaintenanceRecordDocument = mongoose.Document & {
  vehicleId: mongoose.Types.ObjectId;
  type: MaintenanceType;
  servicedDate?: string;
  odometerAtServiceKm?: number;
  nextDueOdometerKm?: number;
  nextDueDate?: string;
  costCents: number;
  status: MaintenanceStatus;
  notes: string;
  isBlocking: boolean;
};

const maintenanceRecordSchema = new Schema<MaintenanceRecordDocument>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    type: { type: String, enum: MAINTENANCE_TYPES, required: true },
    servicedDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    odometerAtServiceKm: { type: Number, min: 0 },
    nextDueOdometerKm: { type: Number, min: 0 },
    nextDueDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    costCents: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: "Pending", index: true },
    notes: { type: String, default: "", maxlength: 1000 },
    isBlocking: { type: Boolean, default: false },
  },
  { timestamps: true },
);

maintenanceRecordSchema.index({ vehicleId: 1, type: 1, status: 1 });
maintenanceRecordSchema.index({ nextDueDate: 1, status: 1 });

export const MaintenanceRecord = mongoose.model<MaintenanceRecordDocument>(
  "MaintenanceRecord",
  maintenanceRecordSchema,
);
