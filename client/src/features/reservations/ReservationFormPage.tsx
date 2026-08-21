import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { Button, ErrorBanner, Field, Input, PageHeader, Panel, Select, centsToDollarInput, dollarsToCents, money, rentalDays } from "../../components/ui";
import type { CustomerWarning } from "@fleetify/shared";

type VehicleOption = {
  _id: string;
  licensePlate: string;
  make: string;
  model: string;
  bodyType?: string;
  dailyRateCents: number;
};

export function ReservationFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vehicles = useApi<{ vehicles: VehicleOption[] }>("/api/vehicles");
  const customers = useApi<{ customers: Array<{ _id: string; name: string; phone: string; warning?: CustomerWarning }> }>("/api/customers");
  const [vehicleId, setVehicleId] = useState(params.get("vehicleId") ?? "");
  const [customerId, setCustomerId] = useState("");
  const [startDate, setStartDate] = useState(params.get("startDate") ?? "");
  const [endDate, setEndDate] = useState(params.get("endDate") ?? "");
  const [expectedDistanceKm, setExpectedDistanceKm] = useState(100);
  const [dailyRateDollars, setDailyRateDollars] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState("");
  const selected = customers.data?.customers.find((item) => item._id === customerId);
  const selectedVehicle = vehicles.data?.vehicles.find((item) => item._id === vehicleId);
  const days = rentalDays(startDate, endDate);
  const rateCents = dollarsToCents(dailyRateDollars);
  const previewTotal = rateCents * days;
  const previewDeposit = Math.round(previewTotal * 0.2);
  const rateDiffers = Boolean(selectedVehicle && rateCents > 0 && rateCents !== selectedVehicle.dailyRateCents);

  useEffect(() => {
    if (!selectedVehicle || dailyRateDollars) return;
    setDailyRateDollars(centsToDollarInput(selectedVehicle.dailyRateCents));
  }, [dailyRateDollars, selectedVehicle]);

  function onVehicleChange(id: string) {
    setVehicleId(id);
    const next = vehicles.data?.vehicles.find((item) => item._id === id);
    setDailyRateDollars(next ? centsToDollarInput(next.dailyRateCents) : "");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const res = await api<{ reservation: { _id: string } }>("/api/reservations", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          customerId,
          startDate,
          endDate,
          expectedDistanceKm: Number(expectedDistanceKm),
          dailyRateCents: rateCents > 0 ? rateCents : undefined,
          customerWarningAcknowledged: ack,
        }),
      });
      navigate(`/reservations/${res.reservation._id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Booking failed");
    }
  }

  return (
    <div>
      <PageHeader title="New booking">
        Daily rate defaults to the vehicle's current rate. Change it only for this booking; totals and deposit follow the rate you save.
      </PageHeader>
      {error ? <ErrorBanner message={error} /> : null}
      <Panel>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Vehicle" id="vehicle">
            <Select id="vehicle" value={vehicleId} onChange={(e) => onVehicleChange(e.target.value)} required>
              <option value="">Select vehicle</option>
              {vehicles.data?.vehicles.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.licensePlate} {item.make} {item.model}{item.bodyType ? ` (${item.bodyType})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Customer" id="customer">
            <Select id="customer" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setAck(false); }} required>
              <option value="">Select customer</option>
              {customers.data?.customers.map((item) => (
                <option key={item._id} value={item._id}>{item.name} {item.phone}</option>
              ))}
            </Select>
          </Field>
          <Field label="Start date" id="start"><Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></Field>
          <Field label="End date" id="end"><Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></Field>
          <Field label="Daily rate (USD)" id="rate">
            <Input
              id="rate"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={dailyRateDollars}
              onChange={(e) => setDailyRateDollars(e.target.value)}
              required
              disabled={!vehicleId}
            />
            {selectedVehicle ? (
              <p className="mt-1 text-xs text-slate-ink">
                Vehicle standard rate is {money(selectedVehicle.dailyRateCents)}/day.
                {rateDiffers ? " This booking will use your override." : " Leave as-is, or raise or lower it for this booking only."}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-ink">Select a vehicle to load its current daily rate.</p>
            )}
          </Field>
          <Field label="Expected distance (km)" id="dist">
            <Input id="dist" type="number" value={expectedDistanceKm} onChange={(e) => setExpectedDistanceKm(Number(e.target.value))} required />
          </Field>
          {days > 0 && rateCents > 0 ? (
            <div className="md:col-span-2 rounded-lg bg-canvas px-3 py-3 text-sm ring-1 ring-line">
              <p className="font-medium">This booking</p>
              <p className="mt-1 text-slate-ink">
                {days} billed day{days === 1 ? "" : "s"} at {money(rateCents)}/day. Total {money(previewTotal)}. Deposit {money(previewDeposit)}.
              </p>
            </div>
          ) : null}
          {selected?.warning?.requiresAcknowledgement ? (
            <div className="md:col-span-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
              <p className="font-medium">Customer warning</p>
              <ul className="mt-1 list-disc pl-5">
                {selected.warning.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
              <label className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                I acknowledge this history and still want to book
              </label>
            </div>
          ) : null}
          <div className="md:col-span-2"><Button type="submit">Create booking</Button></div>
        </form>
      </Panel>
    </div>
  );
}
