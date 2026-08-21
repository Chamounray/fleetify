export const DEFAULT_MAINTENANCE_RULES = [
  { type: "Oil Change", intervalKm: 5000, intervalDays: 180, isBlocking: true },
  { type: "Tire Rotation", intervalKm: 10000, intervalDays: 365, isBlocking: false },
  { type: "Brake Check", intervalKm: 20000, intervalDays: 365, isBlocking: true },
  { type: "Inspection", intervalKm: 0, intervalDays: 365, isBlocking: true },
] as const;

export const DEPOSIT_RATE = 0.2;
export const MIN_RENTAL_DAYS = 1;
