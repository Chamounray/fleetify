import mongoose, { Schema } from "mongoose";
import {
  DAMAGE_SEVERITIES,
  DAMAGE_TYPES,
  DAMAGE_ZONES,
  RESERVATION_STATUSES,
  type DamageMark,
  type InspectionCheck,
  type ReservationStatus,
} from "@fleetify/shared";

export type PartySnapshot = {
  name: string;
  phone: string;
  email?: string;
};

export type VehicleSnapshot = {
  make: string;
  model: string;
  year: number;
  licensePlate: string;
};

export type ReservationDocument = mongoose.Document & {
  vehicleId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  customerSnapshot: PartySnapshot;
  vehicleSnapshot: VehicleSnapshot;
  startDate: string;
  endDate: string;
  dailyRateCents: number;
  expectedDistanceKm: number;
  totalPriceCents: number;
  securityDepositCents: number;
  status: ReservationStatus;
  pickupOdometerKm?: number;
  returnOdometerKm?: number;
  pickupFuelLevelPct?: number;
  returnFuelLevelPct?: number;
  customerWarningAcknowledged: boolean;
  inspectionChecks: InspectionCheck[];
  notes: string;
};

const damageSchema = new Schema<DamageMark>(
  {
    zone: { type: String, enum: DAMAGE_ZONES, required: true },
    type: { type: String, enum: DAMAGE_TYPES, required: true },
    severity: { type: String, enum: DAMAGE_SEVERITIES, required: true },
    notes: { type: String, default: "", maxlength: 500 },
  },
  { _id: false },
);

const inspectionSchema = new Schema<InspectionCheck>(
  {
    kind: { type: String, enum: ["pickup", "return"], required: true },
    recordedAt: { type: String, required: true },
    odometerKm: { type: Number, required: true, min: 0 },
    fuelLevelPct: { type: Number, required: true, min: 0, max: 100 },
    notes: { type: String, default: "", maxlength: 1000 },
    damage: { type: [damageSchema], default: [] },
  },
  { _id: false },
);

const reservationSchema = new Schema<ReservationDocument>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerSnapshot: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: "" },
    },
    vehicleSnapshot: {
      make: { type: String, required: true },
      model: { type: String, required: true },
      year: { type: Number, required: true },
      licensePlate: { type: String, required: true },
    },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dailyRateCents: { type: Number, required: true, min: 1 },
    expectedDistanceKm: { type: Number, required: true, min: 0 },
    totalPriceCents: { type: Number, required: true, min: 0 },
    securityDepositCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: RESERVATION_STATUSES, default: "Confirmed", index: true },
    pickupOdometerKm: { type: Number, min: 0 },
    returnOdometerKm: { type: Number, min: 0 },
    pickupFuelLevelPct: { type: Number, min: 0, max: 100 },
    returnFuelLevelPct: { type: Number, min: 0, max: 100 },
    customerWarningAcknowledged: { type: Boolean, default: false },
    inspectionChecks: { type: [inspectionSchema], default: [] },
    notes: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true },
);

reservationSchema.index({ vehicleId: 1, startDate: 1, endDate: 1 });
reservationSchema.index({ endDate: 1, status: 1 });

export const Reservation = mongoose.model<ReservationDocument>("Reservation", reservationSchema);
