import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { Icon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function PageHeader({ title, actions, children }: { title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:mb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="hidden text-2xl font-semibold tracking-tight lg:block">{title}</h1>
        {children ? <p className="max-w-[65ch] text-sm text-slate-ink lg:mt-1">{children}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`fy-card rounded-xl bg-surface p-5 shadow-[var(--fy-shadow)] ring-1 ring-line ${className}`}>
      {children}
    </section>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  tone = "action",
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: number;
  icon: Icon;
  tone?: "action" | "ok" | "drain" | "amber";
  to?: string;
}) {
  const tones = {
    action: "bg-action/10 text-action",
    ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    drain: "bg-drain/10 text-drain",
    amber: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  };
  const trendLabel =
    trend === undefined ? null : trend > 0 ? `+${trend}% vs last month` : trend < 0 ? `${trend}% vs last month` : "Flat vs last month";
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-slate-ink">{label}</p>
        <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        {trendLabel ? (
          <p className={`mt-2 text-xs ${trend && trend < 0 ? "text-drain" : "text-emerald-700 dark:text-emerald-300"}`}>
            {trendLabel}
          </p>
        ) : hint ? (
          <p className="mt-2 text-xs text-slate-ink">{hint}</p>
        ) : null}
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={18} weight="bold" />
      </span>
    </div>
  );
  if (to) {
    return (
      <Link
        to={to}
        className="fy-card block cursor-pointer rounded-xl bg-surface p-5 shadow-[var(--fy-shadow)] ring-1 ring-line transition-[box-shadow,ring-color] duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-action/50"
      >
        {inner}
      </Link>
    );
  }
  return <Panel>{inner}</Panel>;
}

export function Button({
  children,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-action text-white hover:opacity-90",
    secondary: "bg-canvas text-ink ring-1 ring-line hover:bg-navy/5",
    danger: "bg-drain text-white hover:opacity-90",
  }[variant];
  return (
    <button
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-[transform,background-color] duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-drain">{error}</p> : <p className="sr-only"> </p>}
    </div>
  );
}

const control =
  "w-full rounded-lg bg-canvas px-3 py-2 text-sm text-ink ring-1 ring-line transition-[box-shadow] duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] focus:ring-2 focus:ring-action";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function StatusBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    Available: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    Booked: "bg-action/15 text-action",
    "In Maintenance": "bg-amber-500/15 text-amber-900 dark:text-amber-300",
    "Out of Service": "bg-drain/15 text-drain",
    Confirmed: "bg-action/15 text-action",
    Active: "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300",
    Completed: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
    Canceled: "bg-navy/10 text-slate-ink",
    Pending: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
    urgent: "bg-drain/15 text-drain",
    warning: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
    info: "bg-navy/10 text-slate-ink",
    Blacklisted: "bg-drain/15 text-drain",
    Unpaid: "bg-amber-500/15 text-amber-900 dark:text-amber-300",
    "Open incident": "bg-amber-500/15 text-amber-900 dark:text-amber-300",
    Resolved: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${map[value] ?? "bg-navy/10 text-slate-ink"}`}>
      {value}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-4 rounded-xl bg-drain/10 px-3 py-2 text-sm text-drain">
      {message}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="px-2 py-8 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-slate-ink">{body}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-navy/10 dark:bg-white/10 ${className}`} />;
}

export function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function dollarsToCents(value: string): number {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToDollarInput(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

export function rentalDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 0;
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}
