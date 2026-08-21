import mongoose, { Schema } from "mongoose";
import type { CustomerIncident } from "@fleetify/shared";
import { normalizePhone } from "../utils/text.js";

export type CustomerDocument = mongoose.Document & {
  name: string;
  phone: string;
  phoneKey: string;
  email: string;
  unpaidBalanceCents: number;
  isBlacklisted: boolean;
  blacklistReason: string;
  incidents: CustomerIncident[];
  rentalCount: number;
  lateReturnCount: number;
};

const incidentSchema = new Schema<CustomerIncident>(
  {
    kind: {
      type: String,
      enum: ["late_return", "unpaid_fine", "vehicle_damage", "other"],
      required: true,
    },
    occurredAt: { type: String, required: true },
    amountCents: { type: Number, required: true, min: 0, default: 0 },
    notes: { type: String, required: true, maxlength: 1000 },
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const customerSchema = new Schema<CustomerDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
    phoneKey: { type: String, required: true, unique: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    unpaidBalanceCents: { type: Number, required: true, min: 0, default: 0 },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: { type: String, default: "", maxlength: 500 },
    incidents: { type: [incidentSchema], default: [] },
    rentalCount: { type: Number, required: true, min: 0, default: 0 },
    lateReturnCount: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

customerSchema.pre("validate", function setPhoneKey() {
  this.phoneKey = normalizePhone(this.phone);
});

customerSchema.virtual("openIncidentCount").get(function openIncidentCount() {
  return this.incidents.filter((incident) => !incident.isResolved).length;
});

customerSchema.index({ name: "text", phone: "text", email: "text" });

export const Customer = mongoose.model<CustomerDocument>("Customer", customerSchema);
