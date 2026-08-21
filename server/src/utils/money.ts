import { env } from "../config/env.js";

export function toMinorUnits(amount: number): number {
  return Math.round(amount);
}

export function formatMoney(cents: number, currency = env.CURRENCY): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}

export function computeRentalTotal(dailyRateCents: number, days: number): number {
  return dailyRateCents * days;
}

export function computeDeposit(totalCents: number, rate = 0.2): number {
  return Math.round(totalCents * rate);
}

export function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
