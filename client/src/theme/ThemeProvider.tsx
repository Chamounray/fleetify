import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";
const STORAGE_KEY = "fleetify.theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): ThemeMode {
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "dark" || value === "light") return value;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => (typeof window === "undefined" ? "light" : readStored()));

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolved: mode,
      setMode: setModeState,
      cycle() {
        const next: ThemeMode = mode === "light" ? "dark" : "light";
        const commit = () => {
          applyTheme(next);
          localStorage.setItem(STORAGE_KEY, next);
          setModeState(next);
        };
        const doc = document as Document & {
          startViewTransition?: (update: () => void) => { finished: Promise<void> };
        };
        if (!prefersReducedMotion() && typeof doc.startViewTransition === "function") {
          doc.startViewTransition(() => {
            applyTheme(next);
          });
          localStorage.setItem(STORAGE_KEY, next);
          setModeState(next);
          return;
        }
        commit();
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeProvider missing");
  return ctx;
}
