import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CustomerWarning } from "@fleetify/shared";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Panel, StatusBadge, money } from "../../components/ui";

type Customer = {
  _id: string;
  name: string;
  phone: string;
  isBlacklisted: boolean;
  unpaidBalanceCents: number;
  openIncidentCount?: number;
  warning?: CustomerWarning;
};

export function CustomersPage() {
  const [params] = useSearchParams();
  const flagged = params.get("flagged") === "true";
  const { data, error, reload } = useApi<{ customers: Customer[] }>(`/api/customers${flagged ? "?flagged=true" : ""}`);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    try {
      await api("/api/customers", { method: "POST", body: JSON.stringify({ name, phone }) });
      setName("");
      setPhone("");
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Save failed");
    }
  }

  return (
    <div>
      <PageHeader title="Customers">
        {flagged
          ? "Showing blacklist, unpaid balance, and open-incident flags. Open a row for full history."
          : "Balances and flags are on each row. Open a customer for rental history and incidents."}
      </PageHeader>
      {error ? <ErrorBanner message={error} /> : null}
      {formError ? <ErrorBanner message={formError} /> : null}
      {flagged ? (
        <p className="mb-4 text-sm">
          <Link className="text-action" to="/customers">Show all customers</Link>
        </p>
      ) : null}
      <Panel className="mb-4">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={onSubmit}>
          <Field label="Name" id="cname"><Input id="cname" value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Phone" id="cphone"><Input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} required /></Field>
          <div className="flex items-end"><Button type="submit">Add customer</Button></div>
        </form>
      </Panel>
      <Panel>
        {!data?.customers.length ? (
          <EmptyState
            title={flagged ? "No flagged customers" : "No customers"}
            body={
              flagged ? (
                <>
                  No blacklist or unpaid balances. <Link className="text-action" to="/customers">Open the full list</Link>.
                </>
              ) : (
                "Add a renter before creating a booking."
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {data.customers.map((item) => (
              <li key={item._id}>
                <Link
                  to={`/customers/${item._id}`}
                  className="flex min-h-14 cursor-pointer items-center justify-between gap-3 py-3 transition-[background-color,transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.99] hover:bg-canvas lg:min-h-0"
                >
                  <span>
                    <span className="font-medium text-action">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-slate-ink">{item.phone}</span>
                  </span>
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    {item.isBlacklisted ? <StatusBadge value="Blacklisted" /> : null}
                    {item.unpaidBalanceCents > 0 ? <StatusBadge value="Unpaid" /> : null}
                    {(item.openIncidentCount ?? 0) > 0 || item.warning?.hasOpenIncident ? <StatusBadge value="Open incident" /> : null}
                    <span className={`font-mono ${item.unpaidBalanceCents > 0 ? "text-drain" : "text-slate-ink"}`}>
                      {money(item.unpaidBalanceCents)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
