import { Link } from "react-router-dom";
import {
  CalendarBlank,
  Car,
  ChartLineUp,
  CurrencyDollar,
  Warning,
  Key,
  Wallet,
} from "@phosphor-icons/react";
import { useApi } from "../../api/useApi";
import { useIsMobile } from "../../hooks/useIsMobile";
import { Button, EmptyState, ErrorBanner, KpiCard, PageHeader, Panel, Skeleton, StatusBadge, money } from "../../components/ui";
import { AreaChart, DonutChart, Gauge, HorizontalBars, VerticalBars } from "../../components/charts";

type Insights = {
  topByNetProfit: Array<{ id: string; label: string; cents: number; hint?: string }>;
  topByRevenue: Array<{ id: string; label: string; cents: number; hint?: string }>;
  costDrains: Array<{ id: string; label: string; cents: number; hint?: string }>;
  topReturningCustomers: Array<{ id: string; label: string; cents: number; hint?: string }>;
  busyWeekdays: Array<{ label: string; count: number }>;
  busyMonths: Array<{ label: string; count: number }>;
  dailyBookings: Array<{ label: string; count: number }>;
};

type Dashboard = {
  today: string;
  period: string;
  kpis: {
    totalVehicles: number;
    utilizationPct: number;
    activeRentals: number;
    urgentAlertCount: number;
    monthlyGrossRevenueCents: number;
    monthlyNetProfitCents: number;
    pendingDepositsCents: number;
    trends: { grossRevenuePct: number; netProfitPct: number; utilizationPts: number };
  };
  mix: { rentalIncomeCents: number; maintenanceCostCents: number; expenseCents: number };
  urgentAlerts: Array<{
    _id: string;
    message: string;
    severity: string;
    vehicleId?: string;
    createdAt?: string;
  }>;
  dueToday: Array<{ _id: string; vehicleSnapshot: { licensePlate: string }; customerSnapshot: { name: string } }>;
  upcomingMaintenance: Array<{
    _id: string;
    type: string;
    nextDueDate?: string;
    vehicleId?: { _id: string; licensePlate: string; make: string; model: string; year: number } | string;
  }>;
  flaggedCustomers: Array<{ _id: string; name: string; isBlacklisted: boolean; unpaidBalanceCents: number }>;
  insights: Insights;
};

export function DashboardPage() {
  const isMobile = useIsMobile();
  const { data, error, loading } = useApi<Dashboard>("/api/dashboard");
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: isMobile ? 4 : 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 lg:h-28" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorBanner message={error} />;
  if (!data) return <EmptyState title="No dashboard data" body="Create vehicles and bookings to populate KPIs." />;

  if (isMobile) {
    return (
      <div className="space-y-3 pb-16">
        <p className="text-sm text-slate-ink">{data.period} · tap a card to dig in</p>
        <div className="grid grid-cols-2 gap-2">
          <KpiCard label="Active" value={String(data.kpis.activeRentals)} hint="On rent now" icon={Key} to="/reservations?status=Active" />
          <KpiCard label="Due today" value={String(data.dueToday.length)} hint="Returns" icon={CalendarBlank} to="/reservations?dueToday=true" />
          <KpiCard label="Alerts" value={String(data.kpis.urgentAlertCount)} hint="Needs action" icon={Warning} tone="drain" to="/alerts" />
          <KpiCard label="Utilized" value={`${data.kpis.utilizationPct}%`} hint="Fleet busy" icon={Car} to="/vehicles" />
        </div>

        <Panel className="!p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Due back today</h2>
            <Link className="text-sm text-action" to="/reservations?dueToday=true">All</Link>
          </div>
          {data.dueToday.length === 0 ? (
            <p className="text-sm text-slate-ink">No returns scheduled for today.</p>
          ) : (
            <ul className="space-y-1">
              {data.dueToday.map((item) => (
                <li key={item._id}>
                  <Link
                    to={`/reservations/${item._id}`}
                    className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl px-2 py-2 active:bg-canvas"
                  >
                    <span className="text-sm">
                      <span className="font-medium">{item.vehicleSnapshot.licensePlate}</span>
                      <span className="text-slate-ink"> · {item.customerSnapshot.name}</span>
                    </span>
                    <span className="text-xs text-action">Open</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="!p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Urgent alerts</h2>
            <Link className="text-sm text-action" to="/alerts">All</Link>
          </div>
          {data.urgentAlerts.length === 0 ? (
            <p className="text-sm text-slate-ink">No urgent alerts.</p>
          ) : (
            <ul className="space-y-1">
              {data.urgentAlerts.slice(0, 5).map((item) => (
                <li key={item._id}>
                  <Link to="/alerts" className="flex min-h-12 cursor-pointer items-start justify-between gap-2 rounded-xl px-2 py-2 active:bg-canvas">
                    <span className="text-sm">{item.message}</span>
                    <StatusBadge value={item.severity} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="!p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Service due</h2>
            <Link className="text-sm text-action" to="/maintenance">All</Link>
          </div>
          {data.upcomingMaintenance.length === 0 ? (
            <p className="text-sm text-slate-ink">Nothing pending.</p>
          ) : (
            <ul className="space-y-1">
              {data.upcomingMaintenance.slice(0, 5).map((item) => {
                const vehicle = typeof item.vehicleId === "object" ? item.vehicleId : null;
                return (
                  <li key={item._id}>
                    <Link to="/maintenance" className="flex min-h-12 cursor-pointer flex-col justify-center rounded-xl px-2 py-2 active:bg-canvas">
                      <span className="text-sm font-medium">{vehicle?.licensePlate ?? "Vehicle"} · {item.type}</span>
                      <span className="text-xs text-slate-ink">
                        {vehicle ? `${vehicle.make} ${vehicle.model}` : ""}
                        {item.nextDueDate ? ` · due ${item.nextDueDate}` : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/finance" className="rounded-2xl bg-surface p-4 ring-1 ring-line active:scale-[0.99]">
            <p className="text-xs text-slate-ink">Net profit</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.kpis.monthlyNetProfitCents)}</p>
          </Link>
          <Link to="/finance" className="rounded-2xl bg-surface p-4 ring-1 ring-line active:scale-[0.99]">
            <p className="text-xs text-slate-ink">Gross revenue</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.kpis.monthlyGrossRevenueCents)}</p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Operations overview" actions={<Link to="/reservations/new"><Button type="button">New booking</Button></Link>}>
        {data.period} snapshot. Press a summary card to open the list behind the number.
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Gross revenue" value={money(data.kpis.monthlyGrossRevenueCents)} trend={data.kpis.trends.grossRevenuePct} icon={CurrencyDollar} to="/finance" />
        <KpiCard label="Net profit" value={money(data.kpis.monthlyNetProfitCents)} trend={data.kpis.trends.netProfitPct} icon={ChartLineUp} tone="ok" to="/finance" />
        <KpiCard label="Active rentals" value={String(data.kpis.activeRentals)} hint={`${data.kpis.totalVehicles} vehicles in fleet`} icon={Key} to="/reservations?status=Active" />
        <KpiCard label="Urgent alerts" value={String(data.kpis.urgentAlertCount)} hint="Open the alerts list" icon={Warning} tone="drain" to="/alerts" />
        <KpiCard label="Due today" value={String(data.dueToday.length)} hint="Returns scheduled for today" icon={CalendarBlank} to="/reservations?dueToday=true" />
        <KpiCard label="Utilization" value={`${data.kpis.utilizationPct}%`} hint={`${data.kpis.trends.utilizationPts > 0 ? "+" : ""}${data.kpis.trends.utilizationPts} pts vs last month`} icon={Car} to="/vehicles" />
        <KpiCard label="Pending deposits" value={money(data.kpis.pendingDepositsCents)} hint="Held on confirmed and active bookings" icon={Wallet} tone="amber" to="/reservations" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <AreaChart items={data.insights.dailyBookings} title="Booked vehicle-days this month" />
        </Panel>
        <Panel>
          <Gauge title="Fleet utilization" percent={data.kpis.utilizationPct} />
        </Panel>
        <Panel>
          <DonutChart
            title="Money mix"
            slices={[
              { label: "Rental income", cents: data.mix.rentalIncomeCents, color: "var(--fy-action)" },
              { label: "Maintenance", cents: data.mix.maintenanceCostCents, color: "#d97706" },
              { label: "Other spend", cents: data.mix.expenseCents, color: "var(--fy-drain)" },
            ]}
          />
        </Panel>
        <Panel>
          <VerticalBars items={data.insights.busyWeekdays} title="Busiest weekdays" />
        </Panel>
        <Panel>
          <VerticalBars items={data.insights.busyMonths} title="Busiest months" />
        </Panel>
        <Panel>
          <HorizontalBars items={data.insights.topByRevenue} title="Best cars by revenue" moneyValues />
        </Panel>
        <Panel>
          <HorizontalBars items={data.insights.topByNetProfit} title="Top performing cars" moneyValues />
        </Panel>
        <Panel>
          <HorizontalBars items={data.insights.costDrains} title="Highest spend cars" moneyValues tone="drain" />
        </Panel>
        <Panel className="lg:col-span-3">
          <HorizontalBars items={data.insights.topReturningCustomers} title="Top returning customers" moneyValues />
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Due back today</h2>
            <Link className="text-sm text-action" to="/reservations?dueToday=true">View list</Link>
          </div>
          {data.dueToday.length === 0 ? (
            <EmptyState
              title="No returns today"
              body={
                <>
                  Nothing is scheduled to come back. <Link className="text-action" to="/reservations">Open reservations</Link> to review other dates.
                </>
              }
            />
          ) : (
            <ul>
              {data.dueToday.map((item) => (
                <li key={item._id} className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-b-0">
                  <span>{item.vehicleSnapshot.licensePlate} / {item.customerSnapshot.name}</span>
                  <Link className="text-action" to={`/reservations/${item._id}`}>Open</Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Urgent alerts</h2>
            <Link className="text-sm text-action" to="/alerts">View all</Link>
          </div>
          {data.urgentAlerts.length === 0 ? (
            <EmptyState
              title="No urgent alerts"
              body={
                <>
                  Mileage and date checks are clear. <Link className="text-action" to="/alerts">Open alerts</Link> or{" "}
                  <Link className="text-action" to="/maintenance">maintenance</Link>.
                </>
              }
            />
          ) : (
            <ul>
              {data.urgentAlerts.map((item) => (
                <li key={item._id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
                  <Link className="text-action" to="/alerts">{item.message}</Link>
                  <StatusBadge value={item.severity} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Upcoming service</h2>
            <Link className="text-sm text-action" to="/maintenance">Open maintenance</Link>
          </div>
          {data.upcomingMaintenance.length === 0 ? (
            <EmptyState
              title="No pending service"
              body={
                <>
                  Schedule work from the <Link className="text-action" to="/maintenance">maintenance page</Link>.
                </>
              }
            />
          ) : (
            <ul>
              {data.upcomingMaintenance.map((item) => {
                const vehicle = typeof item.vehicleId === "object" ? item.vehicleId : null;
                return (
                  <li key={item._id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
                    <div className="min-w-0">
                      <p className="font-medium">{vehicle ? vehicle.licensePlate : "Vehicle"} · {item.type}</p>
                      <p className="truncate text-xs text-slate-ink">
                        {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : ""}
                        {item.nextDueDate ? `${vehicle ? " · " : ""}due ${item.nextDueDate}` : ""}
                      </p>
                    </div>
                    <Link className="shrink-0 text-action" to="/maintenance">Open</Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Customer flags</h2>
            <Link className="text-sm text-action" to="/customers?flagged=true">View flagged</Link>
          </div>
          {data.flaggedCustomers.length === 0 ? (
            <EmptyState
              title="No flags"
              body={
                <>
                  No blacklist or unpaid balances. <Link className="text-action" to="/customers">Open customers</Link>.
                </>
              }
            />
          ) : (
            <ul>
              {data.flaggedCustomers.map((item) => (
                <li key={item._id} className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-b-0">
                  <Link className="text-action" to={`/customers/${item._id}`}>{item.name}</Link>
                  <span>{item.isBlacklisted ? "Blacklisted" : money(item.unpaidBalanceCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
