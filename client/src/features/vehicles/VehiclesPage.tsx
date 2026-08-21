import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "../../api/useApi";
import { useIsMobile } from "../../hooks/useIsMobile";
import { Button, EmptyState, ErrorBanner, PageHeader, Panel, StatusBadge, money } from "../../components/ui";

type Vehicle = {
  _id: string;
  make: string;
  model: string;
  year: number;
  bodyType?: string;
  licensePlate: string;
  dailyRateCents: number;
  currentOdometerKm: number;
  status: string;
  fuelLevelPct: number;
};

export function VehiclesPage() {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const type = params.get("type")?.trim() ?? "";
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (type) qs.set("type", type);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const { data, error, loading } = useApi<{ vehicles: Vehicle[] }>(`/api/vehicles${suffix}`);

  return (
    <div>
      <PageHeader
        title="Vehicles"
        actions={
          isMobile ? undefined : (
            <Link to="/vehicles/new"><Button type="button">Add vehicle</Button></Link>
          )
        }
      >
        {q || type
          ? `Showing${type ? ` ${type}` : ""} matches${q ? ` for ${q}` : ""}.`
          : "Fleet inventory, rates, and current status."}
      </PageHeader>
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <p className="text-sm text-slate-ink">Loading vehicles...</p> : null}
      {!loading && !data?.vehicles.length ? (
        <Panel>
          <EmptyState title="No vehicles" body="Add the first car to start booking." />
        </Panel>
      ) : null}

      {data?.vehicles.length && isMobile ? (
        <ul className="space-y-2 pb-16">
          {data.vehicles.map((vehicle) => (
            <li key={vehicle._id}>
              <Link
                to={`/vehicles/${vehicle._id}`}
                className="fy-card block cursor-pointer rounded-2xl bg-surface p-4 ring-1 ring-line transition-[transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold">{vehicle.licensePlate}</p>
                    <p className="mt-0.5 text-sm text-slate-ink">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="mt-1 text-xs text-slate-ink">
                      {vehicle.bodyType ?? "Sedan"} · {vehicle.currentOdometerKm.toLocaleString()} km
                    </p>
                  </div>
                  <StatusBadge value={vehicle.status} />
                </div>
                <p className="mt-3 text-sm font-medium tabular-nums">{money(vehicle.dailyRateCents)}/day</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {data?.vehicles.length && !isMobile ? (
        <Panel>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-2">Plate</th>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Odometer</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.vehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="border-t border-line">
                    <td className="py-2">
                      <Link className="text-action" to={`/vehicles/${vehicle._id}`}>{vehicle.licensePlate}</Link>
                    </td>
                    <td>{vehicle.year} {vehicle.make} {vehicle.model}</td>
                    <td>{vehicle.bodyType ?? "Sedan"}</td>
                    <td><StatusBadge value={vehicle.status} /></td>
                    <td className="font-mono">{vehicle.currentOdometerKm} km</td>
                    <td className="font-mono">{money(vehicle.dailyRateCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
