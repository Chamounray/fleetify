import { FormEvent, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarBlank,
  Car,
  ChartLineUp,
  SignOut,
  Users,
  Wrench,
  SquaresFour,
  ClipboardText,
  MagnifyingGlass,
  Warning,
  HandWaving,
  UserGear,
} from "@phosphor-icons/react";
import { useAuth } from "../auth/AuthContext";
import { ThemeToggle } from "../theme/ThemeToggle";
import { BrandLockup } from "./BrandMark";
import { Input } from "./ui";
import { useIsMobile } from "../hooks/useIsMobile";
import { MobileShell } from "./MobileShell";

const baseGroups = [
  {
    label: "Operations",
    items: [
      { to: "/", label: "Dashboard", icon: SquaresFour },
      { to: "/calendar", label: "Calendar", icon: CalendarBlank },
      { to: "/reservations", label: "Reservations", icon: ClipboardText },
      { to: "/alerts", label: "Alerts", icon: Warning },
    ],
  },
  {
    label: "Fleet",
    items: [
      { to: "/vehicles", label: "Vehicles", icon: Car },
      { to: "/maintenance", label: "Maintenance", icon: Wrench },
    ],
  },
  {
    label: "People and money",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/finance", label: "Analytics", icon: ChartLineUp },
    ],
  },
];

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/calendar": "Calendar",
  "/vehicles": "Vehicles",
  "/reservations": "Reservations",
  "/customers": "Customers",
  "/maintenance": "Maintenance",
  "/finance": "Analytics",
  "/alerts": "Alerts",
  "/users": "Users",
};

function firstName(name?: string, email?: string): string {
  const fromName = name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const local = email?.split("@")[0];
  return local || "there";
}

function DesktopShell() {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const hello = firstName(admin?.name, admin?.email);
  const groups = useMemo(() => {
    if (admin?.role !== "SuperAdmin") return baseGroups;
    return [
      ...baseGroups,
      {
        label: "Settings",
        items: [{ to: "/users", label: "User management", icon: UserGear }],
      },
    ];
  }, [admin?.role]);
  const title = useMemo(() => {
    const match = Object.keys(titles)
      .sort((a, b) => b.length - a.length)
      .find((path) => (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)));
    return titles[match ?? "/"] ?? "Fleetify";
  }, [location.pathname]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/vehicles?q=${encodeURIComponent(q)}` : "/vehicles");
  }

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink">
      <div className="mx-auto grid min-h-[100dvh] max-w-[1600px] grid-cols-[240px_1fr]">
        <aside className="border-r border-line bg-surface">
          <div className="flex h-14 items-center px-4">
            <BrandLockup size={28} />
          </div>
          <nav className="px-3 pb-3">
            {groups.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="px-3 pb-1 text-[11px] font-medium text-slate-ink">{group.label}</p>
                {group.items.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === "/"}
                      className={({ isActive }) =>
                        `relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                          isActive
                            ? "bg-action/10 font-medium text-action"
                            : "text-slate-ink hover:bg-canvas"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-action" /> : null}
                          <Icon size={16} weight={isActive ? "bold" : "regular"} />
                          {link.label}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-col">
          <header className="relative z-20 flex h-14 items-center gap-3 border-b border-line bg-surface px-6">
            <p className="text-sm font-medium">{title}</p>
            <form className="min-w-0 flex-1" onSubmit={onSearch}>
              <label className="sr-only" htmlFor="global-search">Search vehicles</label>
              <div className="relative max-w-md">
                <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-ink" />
                <Input
                  id="global-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search plates, make, or model"
                  className="pl-9"
                />
              </div>
            </form>
            <p className="group/hello flex items-center gap-1.5 text-sm font-medium">
              <span>Hi {hello}</span>
              <HandWaving size={16} weight="fill" className="fy-wave-hand text-action" aria-hidden />
            </p>
            <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              className="group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-ink ring-1 ring-line transition-[background-color,transform] duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-canvas active:scale-[0.96]"
              aria-label="Logout"
            >
              <SignOut size={16} />
              <span className="pointer-events-none absolute -bottom-8 right-0 z-20 rounded-md bg-navy px-2 py-1 text-xs text-white opacity-0 shadow-sm transition-[opacity,transform] delay-300 duration-[180ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
                Logout
              </span>
            </button>
          </header>
          <main className="flex-1 px-6 py-5">
            <div key={location.pathname} className="animate-page">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function AppShell() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileShell /> : <DesktopShell />;
}
