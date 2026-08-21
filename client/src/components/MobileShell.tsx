import { FormEvent, useEffect, useId, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarBlank,
  Car,
  ChartLineUp,
  ClipboardText,
  DotsThreeOutline,
  MagnifyingGlass,
  Plus,
  SignOut,
  SquaresFour,
  UserGear,
  Users,
  Warning,
  Wrench,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "../theme/ThemeToggle";
import { BrandMark } from "./BrandMark";
import { Input } from "./ui";
import { useApi } from "../api/useApi";

const tabs = [
  { to: "/", label: "Home", icon: SquaresFour, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarBlank, end: false },
  { to: "/reservations", label: "Bookings", icon: ClipboardText, end: false },
  { to: "/vehicles", label: "Fleet", icon: Car, end: false },
] as const;

const baseMoreLinks = [
  { to: "/alerts", label: "Alerts", icon: Warning, hint: "Urgent fleet warnings" },
  { to: "/maintenance", label: "Maintenance", icon: Wrench, hint: "Service due by car" },
  { to: "/customers", label: "Customers", icon: Users, hint: "Renter profiles" },
  { to: "/finance", label: "Analytics", icon: ChartLineUp, hint: "Revenue and costs" },
] as const;

const titles: Record<string, string> = {
  "/": "Home",
  "/calendar": "Calendar",
  "/vehicles": "Fleet",
  "/reservations": "Bookings",
  "/customers": "Customers",
  "/maintenance": "Maintenance",
  "/finance": "Analytics",
  "/alerts": "Alerts",
  "/users": "Users",
};

function pageTitle(pathname: string): string {
  const match = Object.keys(titles)
    .sort((a, b) => b.length - a.length)
    .find((path) => (path === "/" ? pathname === "/" : pathname.startsWith(path)));
  return titles[match ?? "/"] ?? "Fleetify";
}

function firstName(name?: string, email?: string): string {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  return email?.split("@")[0] || "there";
}

export function MobileShell() {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const sheetId = useId();
  const hello = firstName(admin?.name, admin?.email);
  const title = useMemo(() => pageTitle(location.pathname), [location.pathname]);
  const alerts = useApi<{ alerts: Array<{ _id: string }> }>("/api/alerts");
  const alertCount = alerts.data?.alerts?.length ?? 0;
  const moreLinks = useMemo(() => {
    if (admin?.role !== "SuperAdmin") return [...baseMoreLinks];
    return [
      ...baseMoreLinks,
      { to: "/users", label: "User management", icon: UserGear, hint: "Create and manage admins" },
    ];
  }, [admin?.role]);

  const moreActive = moreLinks.some((link) => location.pathname.startsWith(link.to));
  const showFab = location.pathname === "/reservations" || location.pathname === "/vehicles" || location.pathname === "/";

  useEffect(() => {
    setMoreOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    navigate(q ? `/vehicles?q=${encodeURIComponent(q)}` : "/vehicles");
  }

  return (
    <div className="fy-mobile min-h-[100dvh] bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
        <div className="flex h-14 items-center gap-2 px-3">
          <BrandMark size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
            <p className="truncate text-[11px] text-slate-ink">Hi {hello}</p>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-ink ring-1 ring-line transition-[background-color,transform] duration-[180ms] ease-[var(--ease-ui)] hover:bg-canvas active:scale-[0.96]"
            aria-label="Search vehicles"
            aria-expanded={searchOpen}
          >
            <MagnifyingGlass size={18} weight="bold" />
          </button>
          <NavLink
            to="/alerts"
            className="relative inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-slate-ink ring-1 ring-line transition-[background-color,transform] duration-[180ms] ease-[var(--ease-ui)] hover:bg-canvas active:scale-[0.96]"
            aria-label={alertCount ? `${alertCount} alerts` : "Alerts"}
          >
            <Warning size={18} weight={alertCount ? "fill" : "regular"} />
            {alertCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-drain px-1 text-[10px] font-semibold text-white">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            ) : null}
          </NavLink>
        </div>
        {searchOpen ? (
          <form className="border-t border-line px-3 py-2" onSubmit={onSearch}>
            <label className="sr-only" htmlFor="mobile-search">Search vehicles</label>
            <Input
              id="mobile-search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Plate, make, or model"
              className="h-11"
            />
          </form>
        ) : null}
      </header>

      <main className="px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3">
        <div key={location.pathname} className="animate-page">
          <Outlet />
        </div>
      </main>

      {showFab ? (
        <LinkFab pathname={location.pathname} />
      ) : null}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-surface/85"
        aria-label="Primary"
      >
        <ul className="grid h-[3.75rem] grid-cols-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <li key={tab.to} className="min-w-0">
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex h-full cursor-pointer flex-col items-center justify-center gap-0.5 transition-[color,transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.96] ${
                      isActive ? "text-action" : "text-slate-ink"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-8 w-12 items-center justify-center rounded-full transition-[background-color] duration-[180ms] ease-[var(--ease-ui)] ${
                          isActive ? "bg-action/10" : ""
                        }`}
                      >
                        <Icon size={20} weight={isActive ? "fill" : "regular"} />
                      </span>
                      <span className="text-[10px] font-medium">{tab.label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
          <li className="min-w-0">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-controls={sheetId}
              onClick={() => setMoreOpen(true)}
              className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0.5 transition-[color,transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.96] ${
                moreOpen || moreActive ? "text-action" : "text-slate-ink"
              }`}
            >
              <span
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-[background-color] duration-[180ms] ease-[var(--ease-ui)] ${
                  moreOpen || moreActive ? "bg-action/10" : ""
                }`}
              >
                <DotsThreeOutline size={20} weight={moreOpen || moreActive ? "fill" : "regular"} />
              </span>
              <span className="text-[10px] font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-navy/40 transition-opacity duration-[180ms] ease-[var(--ease-ui)]"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id={sheetId}
            role="dialog"
            aria-modal="true"
            aria-label="More destinations"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgb(15_23_42_/_0.18)] ring-1 ring-line"
          >
            <div className="flex justify-center pt-3">
              <span className="h-1 w-10 rounded-full bg-line" />
            </div>
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <div>
                <p className="text-base font-semibold">More</p>
                <p className="text-xs text-slate-ink">Signed in as {admin?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl ring-1 ring-line active:scale-[0.96]"
                aria-label="Close"
              >
                <X size={18} weight="bold" />
              </button>
            </div>
            <ul className="px-3 pb-3">
              {moreLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `mb-1 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition-[background-color,transform] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.99] ${
                          isActive ? "bg-action/10 text-action" : "hover:bg-canvas"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isActive ? "bg-action/15" : "bg-canvas"}`}>
                            <Icon size={20} weight={isActive ? "fill" : "regular"} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{link.label}</span>
                            <span className="block text-xs text-slate-ink">{link.hint}</span>
                          </span>
                          {link.to === "/alerts" && alertCount > 0 ? (
                            <span className="rounded-full bg-drain px-2 py-0.5 text-[11px] font-semibold text-white">
                              {alertCount}
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <ThemeToggle />
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-medium text-drain ring-1 ring-line transition-[background-color,transform] duration-[180ms] ease-[var(--ease-ui)] hover:bg-canvas active:scale-[0.98]"
              >
                <SignOut size={16} weight="bold" />
                Log out
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LinkFab({ pathname }: { pathname: string }) {
  const to = pathname.startsWith("/vehicles") ? "/vehicles/new" : "/reservations/new";
  const label = pathname.startsWith("/vehicles") ? "Add vehicle" : "New booking";
  return (
    <NavLink
      to={to}
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 cursor-pointer items-center gap-2 rounded-full bg-action px-5 text-sm font-semibold text-white shadow-[0_10px_28px_rgb(37_99_235_/_0.35)] transition-[transform,opacity] duration-[180ms] ease-[var(--ease-ui)] active:scale-[0.96]"
      aria-label={label}
    >
      <Plus size={18} weight="bold" />
      <span>{label}</span>
    </NavLink>
  );
}
