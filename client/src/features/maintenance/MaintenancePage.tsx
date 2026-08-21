import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MAINTENANCE_TYPES } from "@fleetify/shared";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageHeader,
  Panel,
  Select,
  StatusBadge,
  centsToDollarInput,
  dollarsToCents,
  money,
} from "../../components/ui";

type VehicleOption = {
  _id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  status: string;
  currentOdometerKm: number;
};

type VehicleRef = {
  _id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  bodyType?: string;
  status: string;
  currentOdometerKm: number;
};

type RecordRow = {
  _id: string;
  type: string;
  status: string;
  nextDueDate?: string;
  nextDueOdometerKm?: number;
  servicedDate?: string;
  odometerAtServiceKm?: number;
  costCents: number;
  isBlocking?: boolean;
  notes?: string;
  vehicleId: string | VehicleRef;
};

function vehicleFromRecord(item: RecordRow): VehicleRef | null {
  if (item.vehicleId && typeof item.vehicleId === "object") return item.vehicleId;
  return null;
}

function vehicleLabel(vehicle: VehicleRef | null, fallbackId?: string): string {
  if (!vehicle) return fallbackId ? `Vehicle ${fallbackId.slice(-6)}` : "Unknown vehicle";
  return `${vehicle.licensePlate} · ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

function dueLabel(item: RecordRow): string {
  const parts: string[] = [];
  if (item.nextDueDate) parts.push(`by ${item.nextDueDate}`);
  if (item.nextDueOdometerKm !== undefined) parts.push(`at ${item.nextDueOdometerKm.toLocaleString()} km`);
  return parts.length ? parts.join(" · ") : "No due date set";
}

export function MaintenancePage() {
  const vehicles = useApi<{ vehicles: VehicleOption[] }>("/api/vehicles");
  const { data, error, reload } = useApi<{ records: RecordRow[] }>("/api/maintenance");
  const [vehicleId, setVehicleId] = useState("");
  const [type, setType] = useState<(typeof MAINTENANCE_TYPES)[number]>("Oil Change");
  const [costDollars, setCostDollars] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [filter, setFilter] = useState<"Pending" | "Completed" | "All">("Pending");
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState("");

  const selectedVehicle = vehicles.data?.vehicles.find((item) => item._id === vehicleId);

  const rows = useMemo(() => {
    const list = data?.records ?? [];
    if (filter === "All") return list;
    return list.filter((item) => item.status === filter);
  }, [data?.records, filter]);

  const pendingCount = data?.records.filter((item) => item.status === "Pending").length ?? 0;

  function onVehicleChange(id: string) {
    setVehicleId(id);
    const next = vehicles.data?.vehicles.find((item) => item._id === id);
    setOdometerKm(next ? String(next.currentOdometerKm) : "");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    try {
      const odo = Number(odometerKm);
      await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId,
          type,
          costCents: dollarsToCents(costDollars || "0"),
          status: "Completed",
          servicedDate: new Date().toISOString().slice(0, 10),
          odometerAtServiceKm: Number.isFinite(odo) ? odo : undefined,
        }),
      });
      await reload();
      await vehicles.reload();
      setCostDollars("");
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Save failed");
    }
  }

  async function complete(item: RecordRow) {
    setBusyId(item._id);
    setFormError("");
    try {
      const vehicle = vehicleFromRecord(item);
      const odo =
        vehicle?.currentOdometerKm ??
        vehicles.data?.vehicles.find((row) => row._id === (typeof item.vehicleId === "string" ? item.vehicleId : item.vehicleId?._id))
          ?.currentOdometerKm;
      await api(`/api/maintenance/${item._id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "Completed",
          servicedDate: new Date().toISOString().slice(0, 10),
          odometerAtServiceKm: odo,
        }),
      });
      await reload();
      await vehicles.reload();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : "Could not complete maintenance");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <PageHeader title="Maintenance">
        Pending work is listed by car first. Completing a job records today’s odometer so the next due date is calculated correctly.
      </PageHeader>
      {error ? <ErrorBanner message={error} /> : null}
      {formError ? <ErrorBanner message={formError} /> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel>
          <p className="text-xs text-slate-ink">Needs attention</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{pendingCount}</p>
        </Panel>
        <Panel>
          <p className="text-xs text-slate-ink">Cars in maintenance</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {vehicles.data?.vehicles.filter((item) => item.status === "In Maintenance").length ?? 0}
          </p>
        </Panel>
        <Panel>
          <p className="text-xs text-slate-ink">Show</p>
          <div className="mt-2 flex rounded-lg ring-1 ring-line">
            {(["Pending", "Completed", "All"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`flex-1 cursor-pointer px-2 py-1.5 text-sm transition-colors duration-[180ms] ${
                  filter === value ? "bg-action/10 font-medium text-action" : "text-slate-ink hover:bg-canvas"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="mb-4">
        <h2 className="mb-3 text-sm font-semibold">Log a completed service</h2>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={onSubmit}>
          <Field label="Vehicle" id="mv">
            <Select id="mv" value={vehicleId} onChange={(e) => onVehicleChange(e.target.value)} required>
              <option value="">Select vehicle</option>
              {vehicles.data?.vehicles.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.licensePlate} · {item.year} {item.make} {item.model}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service type" id="mt">
            <Select id="mt" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {MAINTENANCE_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
          <Field label="Odometer at service (km)" id="mo">
            <Input
              id="mo"
              type="number"
              min="0"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
              required
            />
            {selectedVehicle ? (
              <p className="mt-1 text-xs text-slate-ink">
                Current reading {selectedVehicle.currentOdometerKm.toLocaleString()} km
              </p>
            ) : null}
          </Field>
          <Field label="Cost (USD)" id="mc">
            <Input
              id="mc"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={costDollars}
              onChange={(e) => setCostDollars(e.target.value)}
              placeholder={centsToDollarInput(0)}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Save completed service
            </Button>
          </div>
        </form>
      </Panel>

      <Panel>
        {!rows.length ? (
          <EmptyState
            title={filter === "Pending" ? "No pending maintenance" : "No records"}
            body={
              filter === "Pending"
                ? "When a car is overdue on oil, brakes, or inspection, it appears here with the plate and model."
                : "Service history will show up after you complete jobs."
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((item) => {
              const vehicle = vehicleFromRecord(item);
              const vehicleIdValue = typeof item.vehicleId === "string" ? item.vehicleId : vehicle?._id;
              return (
                <li key={item._id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {vehicleIdValue ? (
                        <Link className="text-base font-semibold text-action" to={`/vehicles/${vehicleIdValue}`}>
                          {vehicle?.licensePlate ?? "Vehicle"}
                        </Link>
                      ) : (
                        <span className="text-base font-semibold">Vehicle</span>
                      )}
                      <StatusBadge value={item.status} />
                      {item.isBlocking ? (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-950 dark:bg-amber-500/20 dark:text-amber-100">
                          Blocks rental
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-ink">
                      {vehicle
                        ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.bodyType ? ` · ${vehicle.bodyType}` : ""}`
                        : vehicleLabel(null, vehicleIdValue)}
                    </p>
                    <p className="mt-2 text-sm font-medium">{item.type}</p>
                    <p className="mt-1 text-sm text-slate-ink">
                      {item.status === "Pending" ? `Due ${dueLabel(item)}` : `Serviced ${item.servicedDate ?? "—"}`}
                      {item.status === "Completed" && item.odometerAtServiceKm !== undefined
                        ? ` · ${item.odometerAtServiceKm.toLocaleString()} km`
                        : ""}
                      {item.costCents > 0 ? ` · ${money(item.costCents)}` : ""}
                    </p>
                    {vehicle && item.status === "Pending" ? (
                      <p className="mt-1 text-xs text-slate-ink">
                        Car now at {vehicle.currentOdometerKm.toLocaleString()} km · status {vehicle.status}
                      </p>
                    ) : null}
                  </div>
                  {item.status === "Pending" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busyId === item._id}
                      onClick={() => void complete(item)}
                    >
                      {busyId === item._id ? "Saving..." : "Mark complete"}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
