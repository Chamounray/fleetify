import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { VEHICLE_BODY_TYPES, type VehicleBodyType } from "@fleetify/shared";
import { CaretLeft, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import { api, ApiClientError } from "../../api/client";
import { useApi } from "../../api/useApi";
import { useIsMobile } from "../../hooks/useIsMobile";
import { Button, EmptyState, ErrorBanner, Field, Input, PageHeader, Panel, Select, StatusBadge, money } from "../../components/ui";
import { MobileCalendar } from "./MobileCalendar";

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

type SpanMode = "week" | "fortnight" | "month";

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekdayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

function dayNumber(date: string): string {
  return date.slice(8);
}

function monthLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function spanDays(mode: SpanMode): number {
  if (mode === "week") return 6;
  if (mode === "fortnight") return 13;
  return 27;
}

export function CalendarPage() {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileCalendar />;
  return <DesktopCalendar />;
}

function DesktopCalendar() {
  const today = new Date().toISOString().slice(0, 10);
  const [anchor, setAnchor] = useState(today);
  const [mode, setMode] = useState<SpanMode>("week");
  const [timelineType, setTimelineType] = useState("");
  const endDate = addDays(anchor, spanDays(mode));
  const timelineQs = new URLSearchParams({ startDate: anchor, endDate });
  const { data, error, loading } = useApi<Timeline>(`/api/reservations/timeline?${timelineQs.toString()}`);

  const [searchFrom, setSearchFrom] = useState(today);
  const [searchTo, setSearchTo] = useState(addDays(today, 6));
  const [searchType, setSearchType] = useState<"" | VehicleBodyType>("");
  const [available, setAvailable] = useState<AvailablePayload | null>(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);

  const days = useMemo(() => {
    const list: string[] = [];
    let cursor = anchor;
    while (cursor <= endDate) {
      list.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return list;
  }, [anchor, endDate]);

  const vehicles = useMemo(() => {
    const rows = data?.vehicles ?? [];
    if (!timelineType) return rows;
    return rows.filter((item) => (item.bodyType ?? "Sedan") === timelineType);
  }, [data?.vehicles, timelineType]);

  async function runAvailability(event?: FormEvent) {
    event?.preventDefault();
    setSearchError("");
    setSearching(true);
    try {
      const qs = new URLSearchParams({ startDate: searchFrom, endDate: searchTo });
      if (searchType) qs.set("type", searchType);
      const result = await api<AvailablePayload>(`/api/vehicles/available?${qs.toString()}`);
      setAvailable(result);
      setAnchor(searchFrom);
      if (searchType) setTimelineType(searchType);
    } catch (err) {
      setAvailable(null);
      setSearchError(err instanceof ApiClientError ? err.message : "Availability search failed");
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    void runAvailability();
    // Initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function shift(delta: number) {
    setAnchor((current) => addDays(current, delta));
  }

  return (
    <div>
      <PageHeader
        title="Fleet calendar"
        actions={
          <Link to="/reservations/new">
            <Button type="button">New booking</Button>
          </Link>
        }
      >
        Search free cars by date and type, then scan the lane chart for who is already out.
      </PageHeader>

      <Panel className="mb-4">
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={(e) => void runAvailability(e)}>
          <Field label="Available from" id="avail-from">
            <Input id="avail-from" type="date" value={searchFrom} onChange={(e) => setSearchFrom(e.target.value)} required />
          </Field>
          <Field label="Available until" id="avail-to">
            <Input id="avail-to" type="date" value={searchTo} onChange={(e) => setSearchTo(e.target.value)} required />
          </Field>
          <Field label="Car type" id="avail-type">
            <Select id="avail-type" value={searchType} onChange={(e) => setSearchType(e.target.value as "" | VehicleBodyType)}>
              <option value="">Any type</option>
              {VEHICLE_BODY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={searching} className="w-full md:w-auto">
              <MagnifyingGlass size={16} weight="bold" />
              {searching ? "Searching..." : "Find free cars"}
            </Button>
          </div>
        </form>
        {searchError ? <div className="mt-3"><ErrorBanner message={searchError} /></div> : null}
        {available ? (
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {available.count} free {available.type ? available.type : "vehicle"}{available.count === 1 ? "" : "s"}{" "}
                <span className="font-normal text-slate-ink">
                  from {monthLabel(available.startDate)} to {monthLabel(available.endDate)}
                </span>
              </p>
            </div>
            {!available.vehicles.length ? (
              <EmptyState
                title="Nothing free in that window"
                body="Try different dates, clear the car type filter, or open the lane chart below for conflicts."
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {available.vehicles.map((vehicle) => (
                  <li key={vehicle._id} className="fy-card rounded-xl bg-canvas p-3 ring-1 ring-line">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link className="font-medium text-action" to={`/vehicles/${vehicle._id}`}>{vehicle.licensePlate}</Link>
                        <p className="mt-0.5 text-sm text-slate-ink">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <p className="mt-1 text-xs text-slate-ink">
                          {vehicle.bodyType} · {money(vehicle.dailyRateCents)}/day
                        </p>
                      </div>
                      <StatusBadge value={vehicle.status} />
                    </div>
                    <Link
                      className="mt-3 inline-flex text-sm font-medium text-action"
                      to={`/reservations/new?vehicleId=${vehicle._id}&startDate=${available.startDate}&endDate=${available.endDate}`}
                    >
                      Book these dates
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Panel>

      {error ? <ErrorBanner message={error} /> : null}

      <Panel>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Lane chart</p>
            <p className="mt-1 text-sm text-slate-ink">
              {monthLabel(anchor)} to {monthLabel(endDate)}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Show type" id="chart-type">
              <Select id="chart-type" value={timelineType} onChange={(e) => setTimelineType(e.target.value)}>
                <option value="">All types</option>
                {VEHICLE_BODY_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </Field>
            <div className="flex rounded-lg ring-1 ring-line">
              {([
                ["week", "7d"],
                ["fortnight", "14d"],
                ["month", "28d"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors duration-[180ms] ${
                    mode === value ? "bg-action/10 font-medium text-action" : "text-slate-ink hover:bg-canvas"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => shift(-(spanDays(mode) + 1))}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg ring-1 ring-line hover:bg-canvas"
              aria-label="Previous range"
            >
              <CaretLeft size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(today)}
              className="h-10 cursor-pointer rounded-lg px-3 text-sm ring-1 ring-line hover:bg-canvas"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shift(spanDays(mode) + 1)}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg ring-1 ring-line hover:bg-canvas"
              aria-label="Next range"
            >
              <CaretRight size={16} weight="bold" />
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-3 text-xs" aria-label="Calendar legend">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-action/80" /> Booking</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500/80" /> Maintenance</span>
          <span className="inline-flex items-center gap-1.5 text-slate-ink">Empty cells are free</span>
        </div>

        {loading && !data ? <p className="text-sm text-slate-ink">Loading timeline...</p> : null}
        {!loading && data && vehicles.length === 0 ? (
          <EmptyState title="No vehicles in this filter" body="Clear the type filter or add cars from the fleet page." />
        ) : null}

        {data && vehicles.length > 0 ? (
          <div
            className="overflow-x-auto rounded-xl ring-1 ring-line"
            tabIndex={0}
            role="grid"
            aria-label="Fleet timeline"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                shift(-(spanDays(mode) + 1));
              }
              if (event.key === "ArrowRight") {
                event.preventDefault();
                shift(spanDays(mode) + 1);
              }
            }}
          >
            <div
              className="min-w-[720px] text-xs"
              style={{
                display: "grid",
                gridTemplateColumns: `180px repeat(${days.length}, minmax(44px, 1fr))`,
              }}
            >
              <div className="sticky left-0 z-20 border-b border-r border-line bg-surface px-3 py-3 font-medium shadow-[4px_0_8px_-6px_rgba(15,23,42,0.25)]">
                Vehicle
              </div>
              {days.map((day) => (
                <div key={day} className="border-b border-l border-line px-1 py-2 text-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate-ink">{weekdayLabel(day)}</div>
                  <div className="mt-0.5 font-medium tabular-nums">{dayNumber(day)}</div>
                </div>
              ))}
              {vehicles.map((vehicle) => (
                <VehicleLane key={vehicle._id} vehicle={vehicle} days={days} data={data} />
              ))}
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function VehicleLane({
  vehicle,
  days,
  data,
}: {
  vehicle: Timeline["vehicles"][number];
  days: string[];
  data: Timeline;
}) {
  const last = days.length - 1;
  const bookings = data.reservations
    .filter((item) => String(item.vehicleId) === vehicle._id)
    .map((item) => {
      if (item.endDate < days[0] || item.startDate > days[last]) return null;
      const start = item.startDate <= days[0] ? 0 : days.findIndex((day) => day >= item.startDate);
      if (start < 0) return null;
      const endRaw = days.findIndex((day) => day > item.endDate);
      const end = endRaw === -1 ? last : endRaw - 1;
      return { ...item, start, end, span: Math.max(1, end - start + 1) };
    })
    .filter(Boolean) as Array<Timeline["reservations"][number] & { start: number; end: number; span: number }>;

  const maintenanceDays = new Set(
    data.slots
      .filter((item) => String(item.vehicleId) === vehicle._id && item.kind === "maintenance" && days.includes(item.date))
      .map((item) => item.date),
  );

  return (
    <div
      className="border-t border-line"
      style={{
        gridColumn: "1 / -1",
        display: "grid",
        gridTemplateColumns: `180px repeat(${days.length}, minmax(44px, 1fr))`,
        minHeight: "3.25rem",
      }}
    >
      <div className="sticky left-0 z-20 border-r border-line bg-surface px-3 py-3 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.25)]">
        <Link className="font-medium text-action" to={`/vehicles/${vehicle._id}`}>{vehicle.licensePlate}</Link>
        <div className="mt-0.5 text-[11px] text-slate-ink">
          {vehicle.make} {vehicle.model}
          {vehicle.bodyType ? ` · ${vehicle.bodyType}` : ""}
        </div>
      </div>
      <div
        className="relative min-h-[3.25rem] overflow-hidden"
        style={{
          gridColumn: `2 / span ${days.length}`,
          display: "grid",
          gridTemplateColumns: `repeat(${days.length}, minmax(44px, 1fr))`,
        }}
      >
        {days.map((day) => (
          <div
            key={day}
            className={`border-l border-line ${maintenanceDays.has(day) ? "bg-amber-500/15" : "bg-transparent"}`}
          />
        ))}
        {bookings.map((booking) => (
          <Link
            key={booking._id}
            to={`/reservations/${booking._id}`}
            title={`${booking.customerSnapshot.name} · ${booking.startDate} to ${booking.endDate}`}
            className="absolute top-2 bottom-2 z-10 flex items-center overflow-hidden rounded-md bg-action px-2 text-[11px] font-medium text-white shadow-sm transition-[opacity,transform] duration-[180ms] hover:opacity-90"
            style={{
              left: `calc(${(booking.start / days.length) * 100}% + 2px)`,
              width: `calc(${(booking.span / days.length) * 100}% - 4px)`,
            }}
          >
            <span className="truncate">{booking.customerSnapshot.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
