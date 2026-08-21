import { Expense } from "../models/Expense.js";
import { MaintenanceRecord } from "../models/MaintenanceRecord.js";
import { Reservation } from "../models/Reservation.js";
import { Vehicle } from "../models/Vehicle.js";
import {
  dateRangeInclusive,
  monthBounds,
  shiftYearMonth,
  tallyMonths,
  tallyWeekdays,
} from "../utils/dates.js";

export type VehicleProfitRow = {
  vehicleId: string;
  displayName: string;
  licensePlate: string;
  rentalIncomeCents: number;
  maintenanceCostCents: number;
  expenseCents: number;
  netProfitCents: number;
  rankLabel: "Most Profitable" | "Cost Drain" | "Break Even";
};

export async function profitabilityByVehicle(startDate: string, endDate: string): Promise<VehicleProfitRow[]> {
  const vehicles = await Vehicle.find().sort({ licensePlate: 1 });
  const reservations = await Reservation.find({
    status: "Completed",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  const maintenance = await MaintenanceRecord.find({
    status: "Completed",
    servicedDate: { $gte: startDate, $lte: endDate },
  });
  const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } });

  const rows = vehicles.map((vehicle) => {
    const rentalIncomeCents = reservations
      .filter((item) => String(item.vehicleId) === String(vehicle._id))
      .reduce((sum, item) => sum + item.totalPriceCents, 0);
    const maintenanceCostCents = maintenance
      .filter((item) => String(item.vehicleId) === String(vehicle._id))
      .reduce((sum, item) => sum + item.costCents, 0);
    const expenseCents = expenses
      .filter((item) => item.vehicleId && String(item.vehicleId) === String(vehicle._id))
      .reduce((sum, item) => sum + item.amountCents, 0);
    const netProfitCents = rentalIncomeCents - maintenanceCostCents - expenseCents;
    return {
      vehicleId: String(vehicle._id),
      displayName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      licensePlate: vehicle.licensePlate,
      rentalIncomeCents,
      maintenanceCostCents,
      expenseCents,
      netProfitCents,
      rankLabel: (netProfitCents > 0 ? "Most Profitable" : netProfitCents < 0 ? "Cost Drain" : "Break Even") as VehicleProfitRow["rankLabel"],
    };
  });

  rows.sort((a, b) => b.netProfitCents - a.netProfitCents || a.licensePlate.localeCompare(b.licensePlate));
  return rows;
}

export async function fleetUtilization(startDate: string, endDate: string): Promise<number> {
  const vehicles = await Vehicle.find({ status: { $ne: "Out of Service" } });
  const days = dateRangeInclusive(startDate, endDate).length;
  const denominator = vehicles.length * days;
  if (denominator === 0) return 0;
  const reservations = await Reservation.find({
    status: { $in: ["Confirmed", "Active", "Completed"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  let booked = 0;
  for (const reservation of reservations) {
    const overlapStart = reservation.startDate > startDate ? reservation.startDate : startDate;
    const overlapEnd = reservation.endDate < endDate ? reservation.endDate : endDate;
    booked += dateRangeInclusive(overlapStart, overlapEnd).length;
  }
  return Math.round((booked / denominator) * 1000) / 10;
}

export async function periodTotals(startDate: string, endDate: string) {
  const completed = await Reservation.find({
    status: "Completed",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  const maintenance = await MaintenanceRecord.find({
    status: "Completed",
    servicedDate: { $gte: startDate, $lte: endDate },
  });
  const expenses = await Expense.find({ date: { $gte: startDate, $lte: endDate } });
  const grossRevenueCents = completed.reduce((sum, item) => sum + item.totalPriceCents, 0);
  const maintenanceCostCents = maintenance.reduce((sum, item) => sum + item.costCents, 0);
  const expenseCents = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  return {
    grossRevenueCents,
    maintenanceCostCents,
    expenseCents,
    netProfitCents: grossRevenueCents - maintenanceCostCents - expenseCents,
  };
}

export type NamedCount = { label: string; count: number };
export type NamedMoney = { id: string; label: string; cents: number; hint?: string };

export type OperationalInsights = {
  topByNetProfit: NamedMoney[];
  topByRevenue: NamedMoney[];
  costDrains: NamedMoney[];
  topReturningCustomers: NamedMoney[];
  busyWeekdays: NamedCount[];
  busyMonths: NamedCount[];
  dailyBookings: NamedCount[];
};

function bookedDates(reservations: Array<{ startDate: string; endDate: string }>, startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (const reservation of reservations) {
    const overlapStart = reservation.startDate > startDate ? reservation.startDate : startDate;
    const overlapEnd = reservation.endDate < endDate ? reservation.endDate : endDate;
    if (overlapEnd < overlapStart) continue;
    dates.push(...dateRangeInclusive(overlapStart, overlapEnd));
  }
  return dates;
}

export async function operationalInsights(startDate: string, endDate: string): Promise<OperationalInsights> {
  const ranking = await profitabilityByVehicle(startDate, endDate);
  const topByNetProfit = ranking
    .filter((row) => row.netProfitCents !== 0 || row.rentalIncomeCents > 0)
    .slice(0, 5)
    .map((row) => ({
      id: row.vehicleId,
      label: row.licensePlate,
      cents: row.netProfitCents,
      hint: row.displayName,
    }));
  const topByRevenue = [...ranking]
    .sort((a, b) => b.rentalIncomeCents - a.rentalIncomeCents || a.licensePlate.localeCompare(b.licensePlate))
    .filter((row) => row.rentalIncomeCents > 0)
    .slice(0, 5)
    .map((row) => ({
      id: row.vehicleId,
      label: row.licensePlate,
      cents: row.rentalIncomeCents,
      hint: row.displayName,
    }));
  const costDrains = [...ranking]
    .map((row) => ({
      ...row,
      spendCents: row.maintenanceCostCents + row.expenseCents,
    }))
    .sort((a, b) => b.spendCents - a.spendCents || a.netProfitCents - b.netProfitCents)
    .filter((row) => row.spendCents > 0)
    .slice(0, 5)
    .map((row) => ({
      id: row.vehicleId,
      label: row.licensePlate,
      cents: row.spendCents,
      hint: row.displayName,
    }));

  const completed = await Reservation.find({
    status: "Completed",
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  const customerTotals = new Map<string, { name: string; count: number; cents: number }>();
  for (const reservation of completed) {
    const id = String(reservation.customerId);
    const current = customerTotals.get(id) ?? {
      name: reservation.customerSnapshot.name,
      count: 0,
      cents: 0,
    };
    current.count += 1;
    current.cents += reservation.totalPriceCents;
    customerTotals.set(id, current);
  }
  const topReturningCustomers = [...customerTotals.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].cents - a[1].cents)
    .slice(0, 5)
    .map(([id, value]) => ({
      id,
      label: value.name,
      cents: value.cents,
      hint: `${value.count} completed rental${value.count === 1 ? "" : "s"}`,
    }));

  const occupancy = await Reservation.find({
    status: { $in: ["Confirmed", "Active", "Completed"] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  const periodDates = bookedDates(occupancy, startDate, endDate);
  const busyWeekdays = tallyWeekdays(periodDates);
  const dailyMap = new Map(dateRangeInclusive(startDate, endDate).map((date) => [date, 0]));
  for (const date of periodDates) {
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1);
  }
  const dailyBookings = [...dailyMap.entries()].map(([label, count]) => ({ label, count }));

  const lookbackMonth = shiftYearMonth(endDate.slice(0, 7), -11);
  const lookbackStart = monthBounds(lookbackMonth).startDate;
  const yearReservations = await Reservation.find({
    status: { $in: ["Confirmed", "Active", "Completed"] },
    startDate: { $lte: endDate },
    endDate: { $gte: lookbackStart },
  });
  const yearDates = bookedDates(yearReservations, lookbackStart, endDate);
  const monthCounts = new Map<string, number>();
  for (let i = 0; i < 12; i += 1) {
    monthCounts.set(shiftYearMonth(lookbackMonth, i), 0);
  }
  for (const { label, count } of tallyMonths(yearDates)) {
    if (monthCounts.has(label)) monthCounts.set(label, count);
  }
  const busyMonths = [...monthCounts.entries()].map(([label, count]) => ({ label, count }));

  return {
    topByNetProfit,
    topByRevenue,
    costDrains,
    topReturningCustomers,
    busyWeekdays,
    busyMonths,
    dailyBookings,
  };
}
