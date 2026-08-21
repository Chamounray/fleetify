import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Panel, Select, StatusBadge, Textarea, dollarsToCents, money } from "../../components/ui";

const INCIDENT_LABEL: Record<string, string> = {
  late_return: "Late return",
  unpaid_fine: "Unpaid fine",
  vehicle_damage: "Vehicle damage",
  other: "Other",
};

type HistoryItem = {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  durationDays: number;
  dailyRateCents: number;
  totalPriceCents: number;
  securityDepositCents: number;
  vehicle: { licensePlate: string; make: string; model: string; year: number };
};

type CustomerPayload = {
  customer: {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    unpaidBalanceCents: number;
    isBlacklisted: boolean;
    blacklistReason: string;
    incidents: Array<{
      _id: string;
      kind: string;
      notes: string;
      isResolved: boolean;
      amountCents: number;
      occurredAt: string;
    }>;
  };
  warning: { reasons: string[] };
  history: HistoryItem[];
};

export function CustomerDetailPage() {
  const { id } = useParams();
  const { data, error, reload } = useApi<CustomerPayload>(id ? `/api/customers/${id}` : null);
  const [kind, setKind] = useState("other");
  const [notes, setNotes] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [formError, setFormError] = useState("");

  async function addIncident(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    try {
      await api(`/api/customers/${id}/incidents`, {
        method: "POST",
        body: JSON.stringify({ kind, notes, amountCents: dollarsToCents(amountDollars) }),
      });
      setNotes("");
      setAmountDollars("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Could not add incident");
    }
  }

  async function toggleBlacklist() {
    if (!id || !data) return;
    await api(`/api/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        isBlacklisted: !data.customer.isBlacklisted,
        blacklistReason: data.customer.isBlacklisted ? "" : "Manual flag",
      }),
    });
    await reload();
  }

  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;
  const c = data.customer;
  const openIncidents = c.incidents.filter((item) => !item.isResolved).length;

  return (
    <div>
      <PageHeader title={c.name} actions={<Button type="button" variant="secondary" onClick={() => void toggleBlacklist()}>{c.isBlacklisted ? "Clear blacklist" : "Blacklist"}</Button>}>
        {c.phone}{c.email ? ` · ${c.email}` : ""}. Open a rental below for dates, the vehicle, and what was charged.
      </PageHeader>
      {formError ? <ErrorBanner message={formError} /> : null}
      {data.warning.reasons.length ? <ErrorBanner message={data.warning.reasons.join(". ")} /> : null}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Panel>
          <p className="text-xs text-slate-ink">Unpaid balance</p>
          <p className={`mt-2 font-mono text-xl ${c.unpaidBalanceCents > 0 ? "text-drain" : ""}`}>{money(c.unpaidBalanceCents)}</p>
          <p className="mt-1 text-xs text-slate-ink">{c.unpaidBalanceCents > 0 ? "Outstanding and visible on new bookings." : "No unpaid balance."}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-slate-ink">Blacklist</p>
          <div className="mt-2">{c.isBlacklisted ? <StatusBadge value="Blacklisted" /> : <span className="text-sm">Not blacklisted</span>}</div>
          {c.isBlacklisted && c.blacklistReason ? <p className="mt-2 text-sm text-slate-ink">{c.blacklistReason}</p> : null}
        </Panel>
        <Panel>
          <p className="text-xs text-slate-ink">Open incidents</p>
          <p className="mt-2 font-mono text-xl">{openIncidents}</p>
          <p className="mt-1 text-xs text-slate-ink">{c.incidents.length} logged in total.</p>
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-semibold">Incidents</h2>
          {!c.incidents.length ? (
            <EmptyState title="No incidents" body="Log damage, late returns, or unpaid fines here. They stay on this history." />
          ) : (
            <ul className="mb-4 divide-y divide-line text-sm">
              {c.incidents.map((item) => (
                <li key={item._id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{INCIDENT_LABEL[item.kind] ?? item.kind}</p>
                    <p className="mt-1 text-slate-ink">{item.notes}</p>
                    <p className="mt-1 text-xs text-slate-ink">
                      {item.occurredAt} · {money(item.amountCents)} · {item.isResolved ? "Resolved" : "Open"}
                    </p>
                  </div>
                  {!item.isResolved ? (
                    <button
                      type="button"
                      className="cursor-pointer text-action"
                      onClick={() => void api(`/api/customers/${c._id}/incidents/${item._id}/resolve`, { method: "POST" }).then(reload)}
                    >
                      Resolve
                    </button>
                  ) : <StatusBadge value="Resolved" />}
                </li>
              ))}
            </ul>
          )}
          <form className="grid gap-3" onSubmit={addIncident}>
            <Field label="Kind" id="kind">
              <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="late_return">Late return</option>
                <option value="unpaid_fine">Unpaid fine</option>
                <option value="vehicle_damage">Vehicle damage</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Amount (USD)" id="amt">
              <Input id="amt" type="number" min="0" step="0.01" inputMode="decimal" value={amountDollars} onChange={(e) => setAmountDollars(e.target.value)} />
            </Field>
            <Field label="Notes" id="notes"><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} required /></Field>
            <Button type="submit">Log incident</Button>
          </form>
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Rental history</h2>
          {!data.history.length ? (
            <EmptyState
              title="No rentals yet"
              body={
                <>
                  Create a booking from{" "}
                  <Link className="text-action" to="/reservations/new">new booking</Link>
                  {" "}to start this customer's history.
                </>
              }
            />
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.history.map((item) => (
                <li key={item._id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link className="font-medium text-action" to={`/reservations/${item._id}`}>
                        {item.vehicle.licensePlate} {item.vehicle.make} {item.vehicle.model}
                      </Link>
                      <p className="mt-1 text-slate-ink">
                        {item.startDate} to {item.endDate} · {item.durationDays} day{item.durationDays === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-slate-ink">
                        Total {money(item.totalPriceCents)} · Deposit {money(item.securityDepositCents)} · Rate {money(item.dailyRateCents)}/day
                      </p>
                    </div>
                    <StatusBadge value={item.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
