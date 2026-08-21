import { describe, expect, it } from "vitest";
import { addDays, dateRangeInclusive, rentalDayCount, tallyWeekdays } from "../utils/dates.js";
import { computeDeposit, computeRentalTotal, percentDelta } from "../utils/money.js";
import { normalizePhone, normalizePlate } from "../utils/text.js";

describe("dates and money", () => {
  it("builds inclusive calendar ranges", () => {
    expect(dateRangeInclusive("2026-08-20", "2026-08-22")).toEqual([
      "2026-08-20",
      "2026-08-21",
      "2026-08-22",
    ]);
    expect(rentalDayCount("2026-08-20", "2026-08-22")).toBe(3);
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
  });

  it("computes totals in cents", () => {
    expect(computeRentalTotal(15000, 3)).toBe(45000);
    expect(computeDeposit(45000)).toBe(9000);
    expect(percentDelta(45000, 30000)).toBe(50);
    expect(percentDelta(0, 0)).toBe(0);
  });

  it("normalizes plate and phone keys", () => {
    expect(normalizePlate("abc-123")).toBe("ABC-123");
    expect(normalizePhone("+1 (312) 847-1928")).toBe("3128471928");
  });

  it("tallies busy weekdays from booked dates", () => {
    const result = tallyWeekdays(["2026-08-20", "2026-08-21", "2026-08-22", "2026-08-22"]);
    expect(result.find((item) => item.label === "Thu")?.count).toBe(1);
    expect(result.find((item) => item.label === "Sat")?.count).toBe(2);
  });
});
