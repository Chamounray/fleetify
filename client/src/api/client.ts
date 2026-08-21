const TOKEN_KEY = "fleetify.token";

/** Empty in local Vite (proxy). Set VITE_API_BASE_URL for a separate API host. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new ApiClientError(res.status, "Request failed", "HTTP");
    return (await res.blob()) as T;
  }
  const body = await res.json();
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      body?.error?.message ?? "Request failed",
      body?.error?.code ?? "HTTP",
      body?.error?.details,
    );
  }
  return body as T;
}

export async function downloadAuthorized(path: string, filename?: string): Promise<void> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(apiUrl(path), { headers });
  if (!res.ok) throw new ApiClientError(res.status, "Download failed", "HTTP");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (blob.type.includes("html")) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? "document";
  anchor.click();
  URL.revokeObjectURL(url);
}
