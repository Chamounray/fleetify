import mongoose, { Schema } from "mongoose";
import {
  DAMAGE_SEVERITIES,
  DAMAGE_TYPES,
  DAMAGE_ZONES,
  MAINTENANCE_TYPES,
  VEHICLE_BODY_TYPES,
  VEHICLE_STATUSES,
  type DamageMark,
  type MaintenanceRule,
  type VehicleBodyType,
  type VehicleStatus,
} from "@fleetify/shared";
import { DEFAULT_MAINTENANCE_RULES } from "../config/constants.js";
import { normalizePlate } from "../utils/text.js";

export type VehicleAttrs = {
  make: string;
  model: string;
  year: number;
  bodyType: VehicleBodyType;
  licensePlate: string;
  dailyRateCents: number;
  currentOdometerKm: number;
  status: VehicleStatus;
  fuelLevelPct: number;
  inspectionExpiresAt: Date;
  maintenanceRules: MaintenanceRule[];
  damageAreas: DamageMark[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

export type VehicleDocument = mongoose.HydratedDocument<VehicleAttrs>;

const maintenanceRuleSchema = new Schema<MaintenanceRule>(
  {
    type: { type: String, enum: MAINTENANCE_TYPES, required: true },
    intervalKm: { type: Number, required: true, min: 0 },
    intervalDays: { type: Number, required: true, min: 0 },
    isBlocking: { type: Boolean, required: true, default: false },
  },
  { _id: false },
);

const damageMarkSchema = new Schema<DamageMark>(
  {
    zone: { type: String, enum: DAMAGE_ZONES, required: true },
    type: { type: String, enum: DAMAGE_TYPES, required: true },
    severity: { type: String, enum: DAMAGE_SEVERITIES, required: true },
    notes: { type: String, default: "", maxlength: 500 },
  },
  { _id: false },
);

const currentYear = new Date().getUTCFullYear();

const vehicleSchema = new Schema<VehicleAttrs>(
  {
    make: { type: String, required: true, trim: true, maxlength: 60 },
    model: { type: String, required: true, trim: true, maxlength: 60 },
    year: { type: Number, required: true, min: 1990, max: currentYear + 1 },
    bodyType: { type: String, enum: VEHICLE_BODY_TYPES, default: "Sedan", index: true },
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      set: normalizePlate,
      match: [/^[A-Z0-9-]{3,12}$/, "Invalid license plate"],
    },
    dailyRateCents: { type: Number, required: true, min: 1 },
    currentOdometerKm: { type: Number, required: true, min: 0 },
    status: { type: String, enum: VEHICLE_STATUSES, default: "Available" },
    fuelLevelPct: { type: Number, required: true, min: 0, max: 100 },
    inspectionExpiresAt: { type: Date, required: true },
    maintenanceRules: {
      type: [maintenanceRuleSchema],
      default: () => DEFAULT_MAINTENANCE_RULES.map((rule) => ({ ...rule })),
    },
    damageAreas: { type: [damageMarkSchema], default: [] },
    notes: { type: String, default: "", maxlength: 1000 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

vehicleSchema.virtual("isInspectionExpired").get(function isInspectionExpired() {
  if (!this.inspectionExpiresAt) return false;
  return this.inspectionExpiresAt.getTime() < Date.now();
});

vehicleSchema.virtual("displayName").get(function displayName() {
  return `${this.year} ${this.make} ${this.model}`;
});

export const Vehicle = mongoose.model<VehicleAttrs>("Vehicle", vehicleSchema);
