import mongoose from "mongoose";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { conflict } from "../utils/api-error.js";
import { dateRangeInclusive } from "../utils/dates.js";
import type { SlotKind } from "@fleetify/shared";

export async function allocateSlots(input: {
  vehicleId: mongoose.Types.ObjectId;
  startDate: string;
  endDate: string;
  kind: SlotKind;
  sourceId: mongoose.Types.ObjectId;
  session?: mongoose.ClientSession;
}): Promise<void> {
  const dates = dateRangeInclusive(input.startDate, input.endDate);
  const docs = dates.map((date) => ({
    vehicleId: input.vehicleId,
    date,
    kind: input.kind,
    sourceId: input.sourceId,
  }));
  try {
    await AvailabilitySlot.insertMany(docs, { session: input.session, ordered: true });
  } catch (error) {
    const mongoErr = error as { code?: number; keyValue?: { date?: string } };
    if (mongoErr.code === 11000) {
      throw conflict("Requested dates overlap an existing booking or maintenance block", {
        conflictingDate: mongoErr.keyValue?.date,
      });
    }
    throw error;
  }
}

export async function releaseSlots(
  sourceId: mongoose.Types.ObjectId,
  session?: mongoose.ClientSession,
): Promise<void> {
  await AvailabilitySlot.deleteMany({ sourceId }, { session });
}

export async function replaceSlots(input: {
  vehicleId: mongoose.Types.ObjectId;
  startDate: string;
  endDate: string;
  kind: SlotKind;
  sourceId: mongoose.Types.ObjectId;
  session?: mongoose.ClientSession;
}): Promise<void> {
  await releaseSlots(input.sourceId, input.session);
  await allocateSlots({ ...input, session: input.session });
}
