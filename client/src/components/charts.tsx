import { money } from "./ui";

export type BarItem = { label: string; count?: number; cents?: number; hint?: string };

function maxValue(items: BarItem[]): number {
  return Math.max(1, ...items.map((item) => Math.abs(item.cents ?? item.count ?? 0)));
}

export function HorizontalBars({
  items,
  title,
  moneyValues = false,
  tone = "action",
}: {
  items: BarItem[];
  title: string;
  moneyValues?: boolean;
  tone?: "action" | "drain";
}) {
  const max = maxValue(items);
  return (
    <figure className="m-0">
      <figcaption className="mb-4 text-sm font-semibold">{title}</figcaption>
      {items.length === 0 ? (
        <p className="text-sm text-slate-ink">No data in this period.</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => {
            const value = item.cents ?? item.count ?? 0;
            const width = Math.max(8, (Math.abs(value) / max) * 100);
            return (
              <li key={`${item.label}-${item.hint ?? ""}`}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span>
                    {item.label}
                    {item.hint ? <span className="ml-2 text-xs text-slate-ink">{item.hint}</span> : null}
                  </span>
                  <span className="font-mono tabular-nums">{moneyValues ? money(value) : value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-canvas">
                  <div
                    className={`h-full rounded-full ${tone === "drain" ? "bg-drain" : "bg-action"}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}

export function VerticalBars({ items, title }: { items: BarItem[]; title: string }) {
  const max = maxValue(items);
  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      {items.length === 0 ? (
        <p className="text-sm text-slate-ink">No data in this period.</p>
      ) : (
        <svg viewBox="0 0 280 150" role="img" aria-label={title} className="h-40 w-full">
          {items.map((item, index) => {
            const value = item.cents ?? item.count ?? 0;
            const gap = 280 / items.length;
            const barWidth = Math.max(10, gap - 10);
            const x = index * gap + 6;
            const height = Math.max(3, (value / max) * 108);
            return (
              <g key={item.label}>
                <rect x={x} y={118 - height} width={barWidth} height={height} rx="4" className="fill-action/80" />
                <text x={x + barWidth / 2} y={136} textAnchor="middle" className="fill-current text-[9px] text-slate-ink">
                  {item.label.length > 7 ? item.label.slice(5) : item.label.slice(0, 3)}
                </text>
                <title>{`${item.label}: ${value}`}</title>
              </g>
            );
          })}
        </svg>
      )}
    </figure>
  );
}

export function AreaChart({ items, title }: { items: BarItem[]; title: string }) {
  const values = items.map((item) => item.count ?? 0);
  const max = Math.max(1, ...values);
  const coords = values.map((value, index) => {
    const x = values.length <= 1 ? 0 : (index / (values.length - 1)) * 280;
    const y = 88 - (value / max) * 72;
    return { x, y, value, label: items[index]?.label ?? "" };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,88 ${line} 280,88`;
  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      {items.length === 0 ? (
        <p className="text-sm text-slate-ink">No occupancy in this period.</p>
      ) : (
        <svg viewBox="0 0 280 100" role="img" aria-label={title} className="h-44 w-full">
          <polygon points={area} className="fill-action/15" />
          <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={line} className="text-action" />
        </svg>
      )}
    </figure>
  );
}

export function DonutChart({
  title,
  slices,
}: {
  title: string;
  slices: Array<{ label: string; cents: number; color: string }>;
}) {
  const total = slices.reduce((sum, slice) => sum + Math.max(0, slice.cents), 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      {total === 0 ? (
        <p className="text-sm text-slate-ink">No money movement in this period.</p>
      ) : (
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 120 120" role="img" aria-label={title} className="h-32 w-32 shrink-0">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="14" className="text-canvas" />
            {slices.map((slice) => {
              const length = (Math.max(0, slice.cents) / total) * circumference;
              const circle = (
                <circle
                  key={slice.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth="14"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 60 60)"
                />
              );
              offset += length;
              return circle;
            })}
            <text x="60" y="64" textAnchor="middle" className="fill-current text-[11px] font-semibold">
              {money(total)}
            </text>
          </svg>
          <ul className="grid gap-2 text-sm">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: slice.color }} />
                  {slice.label}
                </span>
                <span className="font-mono tabular-nums">{money(slice.cents)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}

export function Gauge({ title, percent }: { title: string; percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <figure className="m-0">
      <figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      <svg viewBox="0 0 180 110" role="img" aria-label={`${title} ${clamped}%`} className="h-32 w-full">
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="currentColor" strokeWidth="14" className="text-canvas" strokeLinecap="round" />
        <path
          d="M20 90 A70 70 0 0 1 160 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="14"
          className="text-action"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${clamped} 100`}
        />
        <text x="90" y="82" textAnchor="middle" className="fill-current font-mono text-xl font-semibold">
          {clamped}%
        </text>
      </svg>
    </figure>
  );
}
