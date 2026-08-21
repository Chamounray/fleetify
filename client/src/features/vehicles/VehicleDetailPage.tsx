import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { Button, EmptyState, ErrorBanner, PageHeader, Panel, StatusBadge, money } from "../../components/ui";

type Vehicle = {
  _id: string;
  make: string;
  model: string;
  year: number;
  bodyType?: string;
  licensePlate: string;
  status: string;
  dailyRateCents: number;
  currentOdometerKm: number;
  fuelLevelPct: number;
  inspectionExpiresAt: string;
};

type Booking = {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  dailyRateCents: number;
  totalPriceCents: number;
  customerSnapshot: { name: string };
};

export function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, reload } = useApi<{ vehicle: Vehicle }>(id ? `/api/vehicles/${id}` : null);
  const bookings = useApi<{ reservations: Booking[] }>(id ? `/api/reservations?vehicleId=${id}` : null);

  async function remove() {
    if (!id || !confirm("Delete this vehicle?")) return;
    try {
      await api(`/api/vehicles/${id}`, { method: "DELETE" });
      navigate("/vehicles");
    } catch (err) {
      alert(err instanceof ApiClientError ? err.message : "Delete failed");
    }
  }

  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;
  const v = data.vehicle;
  return (
    <div>
      <PageHeader
        title={`${v.year} ${v.make} ${v.model}`}
        actions={
          <div className="flex gap-2">
            <Link to={`/vehicles/${v._id}/edit`}><Button type="button" variant="secondary">Edit</Button></Link>
            <Button type="button" variant="danger" onClick={() => void remove()}>Delete</Button>
          </div>
        }
      >
        {v.licensePlate} · {v.bodyType ?? "Sedan"}. Standard daily rate is {money(v.dailyRateCents)}. Bookings below show the rate actually used.
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel><p className="text-xs text-slate-500">Status</p><div className="mt-2"><StatusBadge value={v.status} /></div></Panel>
        <Panel><p className="text-xs text-slate-500">Daily rate</p><p className="mt-2 font-mono text-xl">{money(v.dailyRateCents)}</p></Panel>
        <Panel><p className="text-xs text-slate-500">Odometer / fuel</p><p className="mt-2 font-mono text-xl">{v.currentOdometerKm} km / {v.fuelLevelPct}%</p></Panel>
      </div>
      <p className="mt-4 text-sm text-slate-ink">Inspection expires {v.inspectionExpiresAt.slice(0, 10)}</p>
      <Panel className="mt-4">
        <h2 className="mb-3 font-semibold">Bookings on this vehicle</h2>
        {!bookings.data?.reservations.length ? (
          <EmptyState
            title="No bookings"
            body={
              <>
                Create a booking from{" "}
                <Link className="text-action" to="/reservations/new">new booking</Link>.
              </>
            }
          />
        ) : (
          <ul className="divide-y divide-line text-sm">
            {bookings.data.reservations.map((item) => (
              <li key={item._id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <Link className="font-medium text-action" to={`/reservations/${item._id}`}>
                    {item.startDate} to {item.endDate} · {item.customerSnapshot.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-ink">
                    Rate used {money(item.dailyRateCents)}/day
                    {item.dailyRateCents !== v.dailyRateCents ? ` (vehicle standard ${money(v.dailyRateCents)})` : " (matches standard)"}
                    {" · "}Total {money(item.totalPriceCents)}
                  </p>
                </div>
                <StatusBadge value={item.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <button type="button" className="mt-4 cursor-pointer text-sm text-action" onClick={() => void reload()}>Refresh</button>
    </div>
  );
}
