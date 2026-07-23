/**
 * Marketing-only surface gate for Vercel Production.
 *
 * Local `npm run dev` = full CRM (gate off).
 * Vercel Production = marketing website only until CRM is intentionally unlocked.
 *
 * Activation (any of these):
 * - `MARKETING_ONLY=true` (explicit)
 * - `VERCEL=1` + `VERCEL_ENV=production` when `MARKETING_ONLY` is unset (fail-safe)
 *
 * Unlock CRM on Production only with an explicit opt-out:
 * - `MARKETING_ONLY=false`
 *
 * Clerk keys must NOT unlock CRM — that was the prior failure mode.
 */

/** Paths that stay public while the marketing-only gate is on. */
export const MARKETING_PUBLIC_PREFIXES = [
  "/",
  "/pricing",
  /** Legacy preview URL — next.config 301 → /pricing; keep public so gate never blocks first. */
  "/pricing-preview",
  "/features",
  "/integrations",
  "/compare",
  "/launch",
  "/demo",
  "/signup",
  "/login",
  "/sign-in",
  "/sign-up",
  "/legal",
  "/crm-unavailable",
  /** Crawl / share surfaces — must not redirect away. */
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image",
  "/icon",
  "/apple-icon",
  "/favicon.ico",
  "/brand",
] as const;

/**
 * App shells / CRM surfaces locked while marketing-only is on.
 * Middleware also blocks anything not on the public allowlist — this list
 * is for explicit checks and docs.
 */
export const PROD_LOCKED_PREFIXES = [
  "/dashboard",
  "/customers",
  "/job-board",
  "/repair-orders",
  "/appointments",
  "/employees",
  "/canned-jobs",
  "/settings",
  "/platform",
  "/messages",
  "/tech-board",
  "/tires",
  "/inventory",
  "/orders",
  "/reports",
  "/marketing",
  "/payments",
  "/quick-labor",
  "/labor-guide",
  "/inspections",
  "/vendors",
  "/maintenance-programs",
  "/support",
  "/timeclock",
  "/design-review",
  "/dev",
  "/catalog",
  "/parts",
  "/finances",
  "/home",
  "/onboarding",
  "/onboard",
  "/approve",
  "/invoice",
  "/inspection",
  "/deposit",
  "/print",
  "/book",
  "/member",
  "/plans",
  "/sites",
  "/preview",
  "/api",
] as const;

function envFlag(value: string | undefined): boolean | null {
  if (value == null || value.trim() === "") return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

/**
 * True when this runtime must serve marketing only (block CRM).
 *
 * Fail-safe: on Vercel Production, missing `MARKETING_ONLY` still blocks CRM.
 * Local / Preview: gate off unless `MARKETING_ONLY=true`.
 */
export function isMarketingOnlyProduction(): boolean {
  const explicit = envFlag(process.env.MARKETING_ONLY);
  if (explicit === false) return false;
  if (explicit === true) return true;

  // Default ON for Vercel Production when env is forgotten.
  return process.env.VERCEL === "1" && process.env.VERCEL_ENV === "production";
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isMarketingPublicPath(pathname: string): boolean {
  // Server Actions / RSC from marketing pages POST to the page path —
  // those must stay on the public allowlist (waitlist + demo leads).
  return MARKETING_PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

export function isProdLockedPath(pathname: string): boolean {
  return PROD_LOCKED_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

/** Clean page for visitors who hit CRM/platform while marketing-only is on. */
export const MARKETING_GATE_REDIRECT = "/crm-unavailable";
