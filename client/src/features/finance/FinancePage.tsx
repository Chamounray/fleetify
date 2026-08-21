import { FormEvent, useState } from "react";
import { EXPENSE_CATEGORIES } from "@fleetify/shared";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { CurrencyDollar, ChartLineUp, Wrench, Receipt } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorBanner, Field, Input, KpiCard, PageHeader, Panel, Select, dollarsToCents, money } from "../../components/ui";
import { AreaChart, DonutChart, HorizontalBars, VerticalBars } from "../../components/charts";

type Insights = {
  topByNetProfit: Array<{ id: string; label: string; cents: number; hint?: string }>;
  topByRevenue: Array<{ id: string; label: string; cents: number; hint?: string }>;
  costDrains: Array<{ id: string; label: string; cents: number; hint?: string }>;
  topReturningCustomers: Array<{ id: string; label: string; cents: number; hint?: string }>;
  busyWeekdays: Array<{ label: string; count: number }>;
  busyMonths: Array<{ label: string; count: number }>;
  dailyBookings: Array<{ label: string; count: number }>;
};

type Finance = {
  period: string;
  totals: { grossRevenueCents: number; maintenanceCostCents: number; expenseCents: number; netProfitCents: number };
  utilization: number;
  ranking: Array<{
    vehicleId: string;
    licensePlate: string;
    displayName: string;
    rentalIncomeCents: number;
    maintenanceCostCents: number;
    expenseCents: number;
    netProfitCents: number;
    rankLabel: string;
  }>;
  insights: Insights;
};

export function FinancePage() {
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const vehicles = useApi<{ vehicles: Array<{ _id: string; licensePlate: string }> }>("/api/vehicles");
  const { data, error, reload } = useApi<Finance>(`/api/dashboard/finance?period=${period}`);
  const expenses = useApi<{ expenses: Array<{ _id: string; category: string; amountCents: number; date: string }> }>("/api/expenses");
  const [vehicleId, setVehicleId] = useState("");
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>("Insurance");
  const [amountDollars, setAmountDollars] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [formError, setFormError] = useState("");

  async function addExpense(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    try {
      await api("/api/expenses", {
        method: "POST",
        body: JSON.stringify({ vehicleId: vehicleId || undefined, category, amountCents: dollarsToCents(amountDollars), date }),
      });
      setAmountDollars("");
      await Promise.all([reload(), expenses.reload()]);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Expense failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Analytics"
        actions={
          <Field label="Period" id="period">
            <Input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Field>
        }
      >
        Revenue leaders, cost drains, returning customers, and occupancy pressure.
      </PageHeader>
      {error ? <ErrorBanner message={error} /> : null}
      {formError ? <ErrorBanner message={formError} /> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Gross revenue" value={money(data.totals.grossRevenueCents)} icon={CurrencyDollar} />
          <KpiCard label="Net profit" value={money(data.totals.netProfitCents)} hint={`${data.utilization}% fleet utilization`} icon={ChartLineUp} tone="ok" />
          <KpiCard label="Maintenance" value={money(data.totals.maintenanceCostCents)} icon={Wrench} tone="amber" />
          <KpiCard label="Other spend" value={money(data.totals.expenseCents)} icon={Receipt} tone="drain" />
        </div>
      ) : null}
      {data?.insights ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel>
            <DonutChart
              title="Money mix"
              slices={[
                { label: "Rental income", cents: data.totals.grossRevenueCents, color: "var(--fy-action)" },
                { label: "Maintenance", cents: data.totals.maintenanceCostCents, color: "#d97706" },
                { label: "Other spend", cents: data.totals.expenseCents, color: "var(--fy-drain)" },
              ]}
            />
          </Panel>
          <Panel><HorizontalBars items={data.insights.topByRevenue} title="Best cars by revenue" moneyValues /></Panel>
          <Panel><HorizontalBars items={data.insights.topByNetProfit} title="Top performing cars" moneyValues /></Panel>
          <Panel><HorizontalBars items={data.insights.costDrains} title="Worst cars by spend" moneyValues tone="drain" /></Panel>
          <Panel><HorizontalBars items={data.insights.topReturningCustomers} title="Top returning customers" moneyValues /></Panel>
          <Panel><VerticalBars items={data.insights.busyWeekdays} title="Most busy days" /></Panel>
          <Panel><VerticalBars items={data.insights.busyMonths} title="Most busy months" /></Panel>
          <Panel className="lg:col-span-2"><AreaChart items={data.insights.dailyBookings} title="Daily occupancy this period" /></Panel>
        </div>
      ) : null}
      <Panel className="mt-4">
        <h2 className="mb-3 font-semibold">Fleet ranking</h2>
        {!data?.ranking.length ? <EmptyState title="No ranking yet" body="Completed rentals and expenses will rank the fleet." /> : (
          <ul className="grid gap-2">
            {data.ranking.map((row) => (
              <li key={row.vehicleId} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-b-0">
                <span>{row.licensePlate} {row.displayName}</span>
                <span className="font-mono tabular-nums">{money(row.netProfitCents)} / {row.rankLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel className="mt-4">
        <h2 className="mb-3 font-semibold">Log expense</h2>
        <form className="grid gap-3 md:grid-cols-5" onSubmit={addExpense}>
          <Field label="Vehicle" id="ev">
            <Select id="ev" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">Fleet-wide</option>
              {vehicles.data?.vehicles.map((item) => <option key={item._id} value={item._id}>{item.licensePlate}</option>)}
            </Select>
          </Field>
          <Field label="Category" id="ec">
            <Select id="ec" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </Select>
          </Field>
          <Field label="Amount (USD)" id="ea">
            <Input id="ea" type="number" min="0.01" step="0.01" inputMode="decimal" value={amountDollars} onChange={(e) => setAmountDollars(e.target.value)} required />
          </Field>
          <Field label="Date" id="ed"><Input id="ed" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></Field>
          <div className="flex items-end"><Button type="submit">Add</Button></div>
        </form>
        <ul className="mt-4 text-sm">
          {expenses.data?.expenses.map((item) => (
            <li key={item._id} className="border-b border-line py-2 last:border-b-0">{item.date} {item.category} {money(item.amountCents)}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
