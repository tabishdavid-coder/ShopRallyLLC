/**
 * Production marketing-only gate: when Clerk is not configured on Vercel Production,
 * CRM + platform must not be openly browsable (stub auth would let anyone in).
 *
 * Local + Preview keep stub access for Macuto / operator QA.
 */

import { isClerkConfigured } from "@/lib/clerk-auth-client";

/** Paths that stay public without Clerk on production. */
export const MARKETING_PUBLIC_PREFIXES = [
  "/",
  "/pricing",
  "/features",
  "/launch",
  "/demo",
  "/signup",
  "/login",
  "/sign-in",
  "/sign-up",
  "/legal",
  "/approve",
  "/invoice",
  "/inspection",
  "/onboard",
  "/sites",
  "/api/webhooks",
  "/api/sites",
  /** Crawl / share surfaces — must not redirect to /launch. */
  "/sitemap.xml",
  "/robots.txt",
  "/opengraph-image",
] as const;

/** App shells locked on production until Clerk is live. */
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
] as const;

export function isMarketingOnlyProduction(): boolean {
  return process.env.VERCEL_ENV === "production" && !isClerkConfigured();
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (prefix === "/") return pathname === "/";
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isMarketingPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/sites")) {
    return true;
  }
  // Server Actions / RSC from marketing pages POST to the page path — those are public prefixes.
  return MARKETING_PUBLIC_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

export function isProdLockedPath(pathname: string): boolean {
  return PROD_LOCKED_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

/** Where to send visitors who hit CRM/platform before Clerk is live. */
export const MARKETING_GATE_REDIRECT = "/launch";
