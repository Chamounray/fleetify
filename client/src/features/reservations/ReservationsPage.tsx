import { Link, useSearchParams } from "react-router-dom";
import { useApi } from "../../api/useApi";
import { useIsMobile } from "../../hooks/useIsMobile";
import { Button, EmptyState, ErrorBanner, PageHeader, Panel, StatusBadge } from "../../components/ui";

type Reservation = {
  _id: string;
  startDate: string;
  endDate: string;
  status: string;
  customerSnapshot: { name: string };
  vehicleSnapshot: { licensePlate: string };
};

export function ReservationsPage() {
  const isMobile = useIsMobile();
  const [params] = useSearchParams();
  const status = params.get("status") ?? "";
  const dueToday = params.get("dueToday") === "true";
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (dueToday) qs.set("dueToday", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const { data, error } = useApi<{ reservations: Reservation[] }>(`/api/reservations${suffix}`);
  const filterLabel = dueToday
    ? "Showing bookings due back today."
    : status
      ? `Showing ${status.toLowerCase()} bookings.`
      : "Confirmed, active, and completed bookings.";

  return (
    <div>
      <PageHeader
        title="Reservations"
        actions={
          isMobile ? undefined : (
            <Link to="/reservations/new"><Button type="button">New booking</Button></Link>
          )
        }
      >
        {filterLabel}
      </PageHeader>
      {dueToday || status ? (
        <p className="mb-4 text-sm">
          <Link className="text-action" to="/reservations">Show all reservations</Link>
        </p>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!data?.reservations.length ? (
        <Panel>
          <EmptyState
            title="No reservations"
            body={
              dueToday ? (
                <>
                  Nothing is due back today. <Link className="text-action" to="/reservations">Open all reservations</Link>.
                </>
              ) : (
                "Create a booking after adding a vehicle and customer."
              )
            }
          />
        </Panel>
      ) : isMobile ? (
        <ul className="space-y-2 pb-16">
          {data.reservations.map((item) => (
            <li key={item._id}>
              <Link
                to={`/reservations/${item._id}`}
                className="fy-card block cursor-pointer rounded-2xl bg-surface p-4 ring-1 ring-line transition-[transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.customerSnapshot.name}</p>
                    <p className="mt-0.5 text-sm text-slate-ink">{item.vehicleSnapshot.licensePlate}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                <p className="mt-3 text-sm tabular-nums text-slate-ink">
                  {item.startDate} to {item.endDate}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Panel>
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-2">Dates</th>
                <th>Vehicle</th>
                <th>Customer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.reservations.map((item) => (
                <tr key={item._id} className="border-t border-line">
                  <td className="py-2">
                    <Link className="text-action" to={`/reservations/${item._id}`}>
                      {item.startDate} to {item.endDate}
                    </Link>
                  </td>
                  <td>{item.vehicleSnapshot.licensePlate}</td>
                  <td>{item.customerSnapshot.name}</td>
                  <td><StatusBadge value={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
