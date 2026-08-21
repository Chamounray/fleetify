import { env } from "../config/env.js";
import { badRequest } from "./api-error.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertCalendarDate(value: string, field = "date"): string {
  if (!DATE_RE.test(value)) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw badRequest(`${field} is not a valid calendar date`);
  }
  return value;
}

export function todayInBusinessTz(now = new Date(), timeZone = env.BUSINESS_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function dateRangeInclusive(startDate: string, endDate: string): string[] {
  if (endDate < startDate) {
    throw badRequest("endDate must be on or after startDate");
  }
  const days: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function rentalDayCount(startDate: string, endDate: string): number {
  return dateRangeInclusive(startDate, endDate).length;
}

export function monthBounds(yearMonth: string): { startDate: string; endDate: string } {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    throw badRequest("period must be YYYY-MM");
  }
  const [year, month] = yearMonth.split("-").map(Number);
  const startDate = `${yearMonth}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { startDate, endDate };
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function weekdayIndex(date: string): number {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

export function tallyWeekdays(dates: string[]): Array<{ label: string; count: number }> {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const date of dates) {
    counts[weekdayIndex(date)] += 1;
  }
  return WEEKDAY_LABELS.map((label, index) => ({ label, count: counts[index] }));
}

export function tallyMonths(dates: string[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const date of dates) {
    const key = date.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, count]) => ({ label, count }));
}

export function shiftYearMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}`;
}
