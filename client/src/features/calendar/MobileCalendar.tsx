import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VEHICLE_BODY_TYPES, type VehicleBodyType } from "@fleetify/shared";
import { CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { Button, EmptyState, ErrorBanner, Field, Input, Panel, Select, StatusBadge, money } from "../../components/ui";

type Timeline = {
  startDate: string;
  endDate: string;
  vehicles: Array<{
    _id: string;
    licensePlate: string;
    make: string;
    model: string;
    bodyType?: string;
    status: string;
  }>;
  reservations: Array<{
    _id: string;
    vehicleId: string;
    startDate: string;
    endDate: string;
    status: string;
    customerSnapshot: { name: string };
  }>;
  slots: Array<{ vehicleId: string; date: string; kind: string }>;
};

type AvailablePayload = {
  startDate: string;
  endDate: string;
  type: string | null;
  count: number;
  vehicles: Array<{
    _id: string;
    licensePlate: string;
    make: string;
    model: string;
    year: number;
    bodyType: string;
    dailyRateCents: number;
    status: string;
  }>;
};

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function monthDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function MobileCalendar() {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDay, setSelectedDay] = useState(today);
  const [stripStart, setStripStart] = useState(addDays(today, -2));
  const [searchFrom, setSearchFrom] = useState(today);
  const [searchTo, setSearchTo] = useState(addDays(today, 6));
  const [searchType, setSearchType] = useState<"" | VehicleBodyType>("");
  const [available, setAvailable] = useState<AvailablePayload | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<"day" | "find">("day");

  const rangeEnd = addDays(selectedDay, 0);
  const { data, error, loading } = useApi<Timeline>(
    `/api/reservations/timeline?startDate=${selectedDay}&endDate=${rangeEnd}`,
  );

  const stripDays = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => addDays(stripStart, i));
  }, [stripStart]);

  async function runAvailability(event?: FormEvent) {
    event?.preventDefault();
    setSearchError("");
    setSearching(true);
    try {
      const qs = new URLSearchParams({ startDate: searchFrom, endDate: searchTo });
      if (searchType) qs.set("type", searchType);
      setAvailable(await api<AvailablePayload>(`/api/vehicles/available?${qs.toString()}`));
    } catch (err) {
      setAvailable(null);
      setSearchError(err instanceof ApiClientError ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  const dayRows = useMemo(() => {
    if (!data) return [];
    return data.vehicles.map((vehicle) => {
      const reservation = data.reservations.find(
        (item) => String(item.vehicleId) === vehicle._id && item.startDate <= selectedDay && item.endDate >= selectedDay,
      );
      const maint = data.slots.some(
        (item) => String(item.vehicleId) === vehicle._id && item.date === selectedDay && item.kind === "maintenance",
      );
      return { vehicle, reservation, maint };
    });
  }, [data, selectedDay]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1 ring-1 ring-line">
        {([
          ["day", "Day board"],
          ["find", "Find free"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`h-11 cursor-pointer rounded-xl text-sm font-medium transition-[background-color,color,transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.98] ${
              mode === value ? "bg-action text-white" : "text-slate-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "find" ? (
        <Panel className="!p-4">
          <form className="grid gap-3" onSubmit={(e) => void runAvailability(e)}>
            <Field label="From" id="m-from">
              <Input id="m-from" type="date" className="h-11" value={searchFrom} onChange={(e) => setSearchFrom(e.target.value)} required />
            </Field>
            <Field label="Until" id="m-to">
              <Input id="m-to" type="date" className="h-11" value={searchTo} onChange={(e) => setSearchTo(e.target.value)} required />
            </Field>
            <Field label="Car type" id="m-type">
              <Select id="m-type" className="h-11" value={searchType} onChange={(e) => setSearchType(e.target.value as "" | VehicleBodyType)}>
                <option value="">Any type</option>
                {VEHICLE_BODY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </Field>
            <Button type="submit" disabled={searching} className="h-12 w-full">
              <MagnifyingGlass size={16} weight="bold" />
              {searching ? "Searching..." : "Find free cars"}
            </Button>
          </form>
          {searchError ? <div className="mt-3"><ErrorBanner message={searchError} /></div> : null}
          {available ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">{available.count} free for these dates</p>
              {!available.vehicles.length ? (
                <EmptyState title="Nothing free" body="Try other dates or clear the type filter." />
              ) : (
                available.vehicles.map((vehicle) => (
                  <div key={vehicle._id} className="rounded-2xl bg-canvas p-3 ring-1 ring-line">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{vehicle.licensePlate}</p>
                        <p className="text-sm text-slate-ink">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                        <p className="mt-1 text-xs text-slate-ink">{vehicle.bodyType} · {money(vehicle.dailyRateCents)}/day</p>
                      </div>
                      <StatusBadge value={vehicle.status} />
                    </div>
                    <Link
                      className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl bg-action text-sm font-semibold text-white active:scale-[0.98]"
                      to={`/reservations/new?vehicleId=${vehicle._id}&startDate=${available.startDate}&endDate=${available.endDate}`}
                    >
                      Book these dates
                    </Link>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </Panel>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-surface ring-1 ring-line active:scale-[0.96]"
              aria-label="Earlier days"
              onClick={() => setStripStart((d) => addDays(d, -7))}
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {stripDays.map((day) => {
                const selected = day === selectedDay;
                const isToday = day === today;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`flex h-[4.25rem] w-14 shrink-0 cursor-pointer flex-col items-center justify-center rounded-2xl transition-[background-color,color,transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.96] ${
                      selected ? "bg-action text-white" : "bg-surface text-ink ring-1 ring-line"
                    }`}
                  >
                    <span className={`text-[10px] uppercase ${selected ? "text-white/80" : "text-slate-ink"}`}>{weekdayShort(day)}</span>
                    <span className="text-lg font-semibold tabular-nums">{day.slice(8)}</span>
                    {isToday ? <span className={`mt-0.5 h-1 w-1 rounded-full ${selected ? "bg-white" : "bg-action"}`} /> : null}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-surface ring-1 ring-line active:scale-[0.96]"
              aria-label="Later days"
              onClick={() => setStripStart((d) => addDays(d, 7))}
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>

          <p className="text-sm font-medium">{monthDay(selectedDay)}</p>
          {error ? <ErrorBanner message={error} /> : null}
          {loading && !data ? <p className="text-sm text-slate-ink">Loading day...</p> : null}

          <ul className="space-y-2">
            {dayRows.map(({ vehicle, reservation, maint }) => (
              <li key={vehicle._id} className="rounded-2xl bg-surface p-3 ring-1 ring-line">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link className="font-semibold text-action" to={`/vehicles/${vehicle._id}`}>{vehicle.licensePlate}</Link>
                    <p className="text-sm text-slate-ink">
                      {vehicle.make} {vehicle.model}
                      {vehicle.bodyType ? ` · ${vehicle.bodyType}` : ""}
                    </p>
                  </div>
                  <StatusBadge value={reservation ? "Booked" : maint ? "In Maintenance" : "Available"} />
                </div>
                {reservation ? (
                  <Link
                    to={`/reservations/${reservation._id}`}
                    className="mt-3 flex min-h-12 cursor-pointer items-center justify-between rounded-xl bg-action/10 px-3 py-2 text-sm font-medium text-action active:scale-[0.99]"
                  >
                    <span>{reservation.customerSnapshot.name}</span>
                    <span className="text-xs opacity-80">{reservation.startDate.slice(5)} to {reservation.endDate.slice(5)}</span>
                  </Link>
                ) : !maint ? (
                  <Link
                    to={`/reservations/new?vehicleId=${vehicle._id}&startDate=${selectedDay}&endDate=${selectedDay}`}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl ring-1 ring-line text-sm font-medium active:scale-[0.98]"
                  >
                    Book this day
                  </Link>
                ) : (
                  <p className="mt-2 text-xs text-slate-ink">Blocked for maintenance</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
