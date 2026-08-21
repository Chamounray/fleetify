import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { VEHICLE_BODY_TYPES, type VehicleBodyType } from "@fleetify/shared";
import { api, ApiClientError } from "../../api/client";
import { Button, ErrorBanner, Field, Input, PageHeader, Panel, Select, centsToDollarInput, dollarsToCents } from "../../components/ui";

const empty = {
  make: "",
  model: "",
  year: new Date().getFullYear(),
  bodyType: "Sedan" as VehicleBodyType,
  licensePlate: "",
  dailyRateDollars: "80.00",
  currentOdometerKm: 0,
  status: "Available",
  fuelLevelPct: 100,
  inspectionExpiresAt: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
};

export function VehicleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    void api<{ vehicle: typeof empty & { dailyRateCents: number; bodyType?: VehicleBodyType; inspectionExpiresAt: string } }>(`/api/vehicles/${id}`).then((res) => {
      setForm({
        make: res.vehicle.make,
        model: res.vehicle.model,
        year: res.vehicle.year,
        bodyType: res.vehicle.bodyType ?? "Sedan",
        licensePlate: res.vehicle.licensePlate,
        dailyRateDollars: centsToDollarInput(res.vehicle.dailyRateCents),
        currentOdometerKm: res.vehicle.currentOdometerKm,
        status: res.vehicle.status,
        fuelLevelPct: res.vehicle.fuelLevelPct,
        inspectionExpiresAt: res.vehicle.inspectionExpiresAt.slice(0, 10),
      });
    });
  }, [id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        make: form.make,
        model: form.model,
        year: Number(form.year),
        bodyType: form.bodyType,
        licensePlate: form.licensePlate,
        dailyRateCents: dollarsToCents(form.dailyRateDollars),
        currentOdometerKm: Number(form.currentOdometerKm),
        status: form.status,
        fuelLevelPct: Number(form.fuelLevelPct),
        inspectionExpiresAt: new Date(form.inspectionExpiresAt).toISOString(),
      };
      const res = id
        ? await api<{ vehicle: { _id: string } }>(`/api/vehicles/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : await api<{ vehicle: { _id: string } }>("/api/vehicles", { method: "POST", body: JSON.stringify(payload) });
      navigate(`/vehicles/${res.vehicle._id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Save failed");
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div>
      <PageHeader title={id ? "Edit vehicle" : "Add vehicle"} />
      {error ? <ErrorBanner message={error} /> : null}
      <Panel>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Make" id="make"><Input id="make" value={form.make} onChange={(e) => set("make", e.target.value)} required /></Field>
          <Field label="Model" id="model"><Input id="model" value={form.model} onChange={(e) => set("model", e.target.value)} required /></Field>
          <Field label="Year" id="year"><Input id="year" type="number" value={form.year} onChange={(e) => set("year", Number(e.target.value))} required /></Field>
          <Field label="Car type" id="bodyType">
            <Select id="bodyType" value={form.bodyType} onChange={(e) => set("bodyType", e.target.value as VehicleBodyType)} required>
              {VEHICLE_BODY_TYPES.map((type) => <option key={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label="License plate" id="plate"><Input id="plate" value={form.licensePlate} onChange={(e) => set("licensePlate", e.target.value)} required /></Field>
          <Field label="Daily rate (USD)" id="rate">
            <Input
              id="rate"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={form.dailyRateDollars}
              onChange={(e) => set("dailyRateDollars", e.target.value)}
              required
            />
          </Field>
          <Field label="Odometer (km)" id="odo"><Input id="odo" type="number" value={form.currentOdometerKm} onChange={(e) => set("currentOdometerKm", Number(e.target.value))} required /></Field>
          <Field label="Fuel level %" id="fuel"><Input id="fuel" type="number" value={form.fuelLevelPct} onChange={(e) => set("fuelLevelPct", Number(e.target.value))} required /></Field>
          <Field label="Status" id="status">
            <Select id="status" value={form.status} onChange={(e) => set("status", e.target.value)}>
              {["Available", "Booked", "In Maintenance", "Out of Service"].map((status) => <option key={status}>{status}</option>)}
            </Select>
          </Field>
          <Field label="Inspection expiration" id="insp">
            <Input id="insp" type="date" value={form.inspectionExpiresAt} onChange={(e) => set("inspectionExpiresAt", e.target.value)} required />
          </Field>
          <div className="md:col-span-2"><Button type="submit">Save vehicle</Button></div>
        </form>
      </Panel>
    </div>
  );
}
