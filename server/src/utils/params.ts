import { badRequest } from "./api-error.js";

export function routeParam(value: string | string[] | undefined, name = "id"): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) throw badRequest(`Missing ${name}`);
  return raw;
}
