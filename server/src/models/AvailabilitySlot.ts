import mongoose, { Schema } from "mongoose";
import { SLOT_KINDS, type SlotKind } from "@fleetify/shared";

export type AvailabilitySlotDocument = mongoose.Document & {
  vehicleId: mongoose.Types.ObjectId;
  date: string;
  kind: SlotKind;
  sourceId: mongoose.Types.ObjectId;
};

const availabilitySlotSchema = new Schema<AvailabilitySlotDocument>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    kind: { type: String, enum: SLOT_KINDS, required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: true },
);

availabilitySlotSchema.index({ vehicleId: 1, date: 1 }, { unique: true });

export const AvailabilitySlot = mongoose.model<AvailabilitySlotDocument>(
  "AvailabilitySlot",
  availabilitySlotSchema,
);
