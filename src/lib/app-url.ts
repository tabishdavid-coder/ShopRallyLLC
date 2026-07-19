import { headers } from "next/headers";

/**
 * Canonical static app origin for OAuth redirects, webhooks, cron, and public
 * share links. Does not read request headers — safe in Route Handlers and
 * background jobs.
 *
 * Resolution order: APP_URL → https://VERCEL_URL → dev localhost:3031 → localhost:3000
 */
export function getAppUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  if (process.env.NODE_ENV === "development") {
    const port = process.env.NEXT_PUBLIC_DEV_PORT?.trim() || "3031";
    return `http://localhost:${port}`;
  }
  return "http://localhost:3000";
}

/** @deprecated Prefer `getAppUrl` — kept for existing imports. */
export const getPublicAppUrl = getAppUrl;

/** Build an absolute URL without request headers (webhooks, OAuth, email/SMS links). */
export function publicUrl(path: string): string {
  const base = getAppUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Absolute origin for the current request (e.g. `https://app.getshoprally.com`). */
export async function getAppOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Build an absolute URL for a path on this app (uses request headers when available). */
export async function appUrl(path: string): Promise<string> {
  const origin = await getAppOrigin();
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
