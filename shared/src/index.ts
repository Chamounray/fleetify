export const VEHICLE_STATUSES = [
  "Available",
  "Booked",
  "In Maintenance",
  "Out of Service",
] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const ADMIN_ROLES = ["SuperAdmin", "Admin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const VEHICLE_BODY_TYPES = [
  "Sedan",
  "SUV",
  "Hatchback",
  "Truck",
  "Van",
  "Coupe",
  "Other",
] as const;
export type VehicleBodyType = (typeof VEHICLE_BODY_TYPES)[number];

export const RESERVATION_STATUSES = [
  "Confirmed",
  "Active",
  "Completed",
  "Canceled",
] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const MAINTENANCE_TYPES = [
  "Oil Change",
  "Tire Rotation",
  "Brake Check",
  "Inspection",
  "Battery",
  "Other",
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const MAINTENANCE_STATUSES = ["Completed", "Pending"] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  "Insurance",
  "Local Taxes",
  "Registration",
  "Parking",
  "Tolls",
  "Cleaning",
  "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const DAMAGE_ZONES = [
  "frontBumper",
  "rearBumper",
  "hood",
  "roof",
  "trunk",
  "windshield",
  "rearWindow",
  "leftFrontDoor",
  "leftRearDoor",
  "rightFrontDoor",
  "rightRearDoor",
  "leftFrontTire",
  "leftRearTire",
  "rightFrontTire",
  "rightRearTire",
] as const;
export type DamageZone = (typeof DAMAGE_ZONES)[number];

export const DAMAGE_TYPES = [
  "scratch",
  "dent",
  "crack",
  "chip",
  "missing",
  "other",
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const DAMAGE_SEVERITIES = ["minor", "moderate", "severe"] as const;
export type DamageSeverity = (typeof DAMAGE_SEVERITIES)[number];

export const ALERT_CATEGORIES = [
  "maintenance",
  "inspection",
  "customer",
  "return",
] as const;
export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export const SLOT_KINDS = ["reservation", "maintenance"] as const;
export type SlotKind = (typeof SLOT_KINDS)[number];

export type MoneyCents = number;
export type CalendarDate = string;

export type MaintenanceRule = {
  type: MaintenanceType;
  intervalKm: number;
  intervalDays: number;
  isBlocking: boolean;
};

export type DamageMark = {
  zone: DamageZone;
  type: DamageType;
  severity: DamageSeverity;
  notes: string;
};

export type InspectionCheck = {
  kind: "pickup" | "return";
  recordedAt: string;
  odometerKm: number;
  fuelLevelPct: number;
  notes: string;
  damage: DamageMark[];
};

export type CustomerIncident = {
  _id?: string;
  kind: "late_return" | "unpaid_fine" | "vehicle_damage" | "other";
  occurredAt: string;
  amountCents: MoneyCents;
  notes: string;
  isResolved: boolean;
};

export type CustomerWarning = {
  isBlacklisted: boolean;
  hasUnpaidBalance: boolean;
  hasOpenIncident: boolean;
  unpaidBalanceCents: MoneyCents;
  reasons: string[];
  requiresAcknowledgement: boolean;
};

export type ApiErrorBody = {
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
};
