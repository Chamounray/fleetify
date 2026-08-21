import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DamageMark } from "@fleetify/shared";
import { api, ApiClientError, downloadAuthorized } from "../../api/client";
import { useApi } from "../../api/useApi";
import { Button, ErrorBanner, Field, Input, PageHeader, Panel, StatusBadge, Textarea, money, rentalDays } from "../../components/ui";
import { DamageMatrix } from "../inspections/DamageMatrix";

type Reservation = {
  _id: string;
  vehicleId: string;
  customerId: string;
  status: string;
  startDate: string;
  endDate: string;
  dailyRateCents: number;
  totalPriceCents: number;
  securityDepositCents: number;
  expectedDistanceKm: number;
  pickupOdometerKm?: number;
  customerSnapshot: { name: string; phone: string };
  vehicleSnapshot: { licensePlate: string; make: string; model: string; year: number };
};

export function ReservationDetailPage() {
  const { id } = useParams();
  const { data, error, reload } = useApi<{ reservation: Reservation; vehicleDailyRateCents: number }>(id ? `/api/reservations/${id}` : null);
  const [odometer, setOdometer] = useState(0);
  const [fuel, setFuel] = useState(100);
  const [notes, setNotes] = useState("");
  const [damage, setDamage] = useState<DamageMark[]>([]);
  const [formError, setFormError] = useState("");

  async function run(path: string) {
    if (!id) return;
    setFormError("");
    try {
      await api(`/api/reservations/${id}/${path}`, {
        method: "POST",
        body: JSON.stringify({
          pickupOdometerKm: odometer,
          pickupFuelLevelPct: fuel,
          returnOdometerKm: odometer,
          returnFuelLevelPct: fuel,
          notes,
          damage,
        }),
      });
      await reload();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Update failed");
    }
  }

  async function cancel() {
    if (!id) return;
    await api(`/api/reservations/${id}/cancel`, { method: "POST" });
    await reload();
  }

  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;
  const r = data.reservation;
  const days = rentalDays(r.startDate, r.endDate);
  const rateOverridden = data.vehicleDailyRateCents !== r.dailyRateCents;

  return (
    <div>
      <PageHeader title={`Booking ${r.vehicleSnapshot.licensePlate}`}>
        {r.vehicleSnapshot.year} {r.vehicleSnapshot.make} {r.vehicleSnapshot.model} for {r.customerSnapshot.name}. {r.startDate} to {r.endDate} ({days} billed day{days === 1 ? "" : "s"}).
      </PageHeader>
      {formError ? <ErrorBanner message={formError} /> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <Panel><p className="text-xs text-slate-500">Status</p><div className="mt-2"><StatusBadge value={r.status} /></div></Panel>
        <Panel><p className="text-xs text-slate-500">Total</p><p className="mt-2 font-mono text-xl">{money(r.totalPriceCents)}</p></Panel>
        <Panel><p className="text-xs text-slate-500">Deposit</p><p className="mt-2 font-mono text-xl">{money(r.securityDepositCents)}</p></Panel>
        <Panel>
          <p className="text-xs text-slate-500">Daily rate</p>
          <p className="mt-2 font-mono text-xl">{money(r.dailyRateCents)}</p>
          <p className="mt-1 text-xs text-slate-ink">
            {rateOverridden
              ? `Booking override. Vehicle standard is ${money(data.vehicleDailyRateCents)}.`
              : `Matches the vehicle standard of ${money(data.vehicleDailyRateCents)}.`}
          </p>
        </Panel>
      </div>
      <p className="mt-3 text-sm text-slate-ink">Expected distance {r.expectedDistanceKm} km.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["contract", "receipt", "pickup", "return"].map((kind) => (
          <button
            key={kind}
            type="button"
            className="cursor-pointer rounded-full bg-navy/5 px-3 py-1 text-sm capitalize text-navy"
            onClick={() => void downloadAuthorized(`/api/documents/${r._id}/${kind}/print`)}
          >
            Print {kind}
          </button>
        ))}
        {["contract", "receipt"].map((kind) => (
          <button
            key={`${kind}-pdf`}
            type="button"
            className="cursor-pointer rounded-full bg-navy/5 px-3 py-1 text-sm text-navy"
            onClick={() => void downloadAuthorized(`/api/documents/${r._id}/${kind}/pdf`, `${kind}.pdf`)}
          >
            PDF {kind}
          </button>
        ))}
        <Link className="cursor-pointer rounded-full bg-navy/5 px-3 py-1 text-sm text-navy" to={`/customers/${r.customerId}`}>
          Customer history
        </Link>
        <Link className="cursor-pointer rounded-full bg-navy/5 px-3 py-1 text-sm text-navy" to={`/vehicles/${r.vehicleId}`}>
          Vehicle
        </Link>
      </div>
      {r.status === "Confirmed" || r.status === "Active" ? (
        <Panel className="mt-6">
          <h2 className="mb-4 font-semibold">{r.status === "Confirmed" ? "Pickup check" : "Return check"}</h2>
          <form className="grid gap-4" onSubmit={(event: FormEvent) => event.preventDefault()}>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Odometer (km)" id="odo"><Input id="odo" type="number" value={odometer} onChange={(e) => setOdometer(Number(e.target.value))} /></Field>
              <Field label="Fuel %" id="fuel"><Input id="fuel" type="number" value={fuel} onChange={(e) => setFuel(Number(e.target.value))} /></Field>
              <Field label="Notes" id="notes"><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            </div>
            <DamageMatrix value={damage} onChange={setDamage} />
            <div className="flex flex-wrap gap-2">
              {r.status === "Confirmed" ? <Button type="button" onClick={() => void run("activate")}>Start rental</Button> : null}
              {r.status === "Active" ? <Button type="button" onClick={() => void run("complete")}>Complete return</Button> : null}
              <Button type="button" variant="secondary" onClick={() => void cancel()}>Cancel</Button>
            </div>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}
