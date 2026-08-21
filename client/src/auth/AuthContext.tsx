import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";

type Admin = { id: string; email: string; name: string; role: string };

type AuthContextValue = {
  token: string | null;
  admin: Admin | null;
  ready: boolean;
  setupRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (input: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [ready, setReady] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const status = await api<{ setupRequired: boolean }>("/api/auth/setup-status");
        if (!cancelled) setSetupRequired(status.setupRequired);
        if (token) {
          const me = await api<{ admin: Admin }>("/api/auth/me");
          if (!cancelled) setAdmin(me.admin);
        }
      } catch {
        clearToken();
        if (!cancelled) {
          setTokenState(null);
          setAdmin(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      admin,
      ready,
      setupRequired,
      async login(email, password) {
        const res = await api<{ token: string; admin: Admin }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setToken(res.token);
        setTokenState(res.token);
        setAdmin(res.admin);
        setSetupRequired(false);
      },
      async setup(input) {
        const res = await api<{ token: string; admin: Admin }>("/api/auth/setup", {
          method: "POST",
          body: JSON.stringify(input),
        });
        setToken(res.token);
        setTokenState(res.token);
        setAdmin(res.admin);
        setSetupRequired(false);
      },
      logout() {
        clearToken();
        setTokenState(null);
        setAdmin(null);
      },
    }),
    [admin, ready, setupRequired, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
