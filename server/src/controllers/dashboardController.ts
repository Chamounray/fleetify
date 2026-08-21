import type { Request, Response } from "express";
import { Alert } from "../models/Alert.js";
import { Vehicle } from "../models/Vehicle.js";
import { Reservation } from "../models/Reservation.js";
import { MaintenanceRecord } from "../models/MaintenanceRecord.js";
import { Customer } from "../models/Customer.js";
import { asyncHandler } from "../utils/async-handler.js";
import { monthBounds, shiftYearMonth, startOfMonth, todayInBusinessTz } from "../utils/dates.js";
import { fleetUtilization, operationalInsights, periodTotals, profitabilityByVehicle } from "../services/financeService.js";
import { percentDelta } from "../utils/money.js";

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const today = todayInBusinessTz();
  const period = typeof req.query.period === "string" ? req.query.period : today.slice(0, 7);
  const { startDate, endDate } = monthBounds(period);
  const previousPeriod = shiftYearMonth(period, -1);
  const previousBounds = monthBounds(previousPeriod);
  const [vehicles, activeRentals, urgentAlerts, dueToday, upcomingMaintenance, flaggedCustomers, totals, previousTotals, utilization, previousUtilization, ranking, insights] =
    await Promise.all([
      Vehicle.countDocuments(),
      Reservation.countDocuments({ status: "Active" }),
      Alert.find({ isResolved: false, severity: "urgent" }).sort({ createdAt: -1 }).limit(20),
      Reservation.find({
        endDate: today,
        status: { $in: ["Confirmed", "Active"] },
      }),
      MaintenanceRecord.find({ status: "Pending" })
        .populate({ path: "vehicleId", select: "licensePlate make model year" })
        .sort({ nextDueDate: 1 })
        .limit(20),
      Customer.find({ $or: [{ isBlacklisted: true }, { unpaidBalanceCents: { $gt: 0 } }] }).limit(20),
      periodTotals(startDate, endDate),
      periodTotals(previousBounds.startDate, previousBounds.endDate),
      fleetUtilization(startDate, endDate),
      fleetUtilization(previousBounds.startDate, previousBounds.endDate),
      profitabilityByVehicle(startDate, endDate),
      operationalInsights(startDate, endDate),
    ]);

  const pendingDeposits = await Reservation.aggregate([
    { $match: { status: { $in: ["Confirmed", "Active"] } } },
    { $group: { _id: null, total: { $sum: "$securityDepositCents" } } },
  ]);

  res.json({
    today,
    period,
    startDate,
    endDate,
    kpis: {
      totalVehicles: vehicles,
      utilizationPct: utilization,
      activeRentals,
      urgentAlertCount: urgentAlerts.length,
      monthlyGrossRevenueCents: totals.grossRevenueCents,
      monthlyNetProfitCents: totals.netProfitCents,
      pendingDepositsCents: pendingDeposits[0]?.total ?? 0,
      trends: {
        grossRevenuePct: percentDelta(totals.grossRevenueCents, previousTotals.grossRevenueCents),
        netProfitPct: percentDelta(totals.netProfitCents, previousTotals.netProfitCents),
        utilizationPts: Math.round((utilization - previousUtilization) * 10) / 10,
      },
    },
    mix: {
      rentalIncomeCents: totals.grossRevenueCents,
      maintenanceCostCents: totals.maintenanceCostCents,
      expenseCents: totals.expenseCents,
    },
    urgentAlerts,
    dueToday,
    upcomingMaintenance,
    flaggedCustomers,
    ranking,
    insights,
    monthStart: startOfMonth(today),
  });
});

export const getFinance = asyncHandler(async (req: Request, res: Response) => {
  const today = todayInBusinessTz();
  const period = typeof req.query.period === "string" ? req.query.period : today.slice(0, 7);
  const { startDate, endDate } = monthBounds(period);
  const [totals, ranking, utilization, insights] = await Promise.all([
    periodTotals(startDate, endDate),
    profitabilityByVehicle(startDate, endDate),
    fleetUtilization(startDate, endDate),
    operationalInsights(startDate, endDate),
  ]);
  res.json({ period, startDate, endDate, totals, ranking, utilization, insights });
});
