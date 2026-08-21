import { Link } from "react-router-dom";
import { useState } from "react";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { EmptyState, ErrorBanner, PageHeader, Panel, StatusBadge } from "../../components/ui";

type AlertRow = {
  _id: string;
  message: string;
  severity: string;
  category: string;
  isResolved: boolean;
  createdAt?: string;
  vehicle?: { _id: string; licensePlate: string; make: string; model: string } | null;
};

export function AlertsPage() {
  const { data, error, reload } = useApi<{ alerts: AlertRow[] }>("/api/alerts");
  const [actionError, setActionError] = useState("");

  async function resolve(id: string) {
    setActionError("");
    try {
      await api(`/api/alerts/${id}/resolve`, { method: "POST" });
      await reload();
    } catch (err) {
      setActionError(err instanceof ApiClientError ? err.message : "Could not resolve alert");
    }
  }

  return (
    <div>
      <PageHeader title="Alerts">
        Unresolved fleet warnings. Open a vehicle for context, or mark an item resolved when the work is done.
      </PageHeader>
      {error ? <ErrorBanner message={error} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}
      <Panel>
        {!data?.alerts.length ? (
          <EmptyState
            title="No open alerts"
            body={
              <>
                Mileage and date checks are clear. Review vehicles on the{" "}
                <Link className="text-action" to="/vehicles">fleet page</Link>
                {" "}or log work under{" "}
                <Link className="text-action" to="/maintenance">maintenance</Link>.
              </>
            }
          />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {data.alerts.map((item) => (
              <li key={item._id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium">{item.message}</p>
                  <p className="mt-1 text-xs text-slate-ink">
                    {item.category}
                    {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ""}
                    {item.vehicle ? ` · ${item.vehicle.make} ${item.vehicle.model}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge value={item.severity} />
                  {item.vehicle ? (
                    <Link className="text-action" to={`/vehicles/${item.vehicle._id}`}>{item.vehicle.licensePlate}</Link>
                  ) : null}
                  <button type="button" className="cursor-pointer text-action" onClick={() => void resolve(item._id)}>
                    Resolve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
