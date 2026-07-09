import { getAppUrl } from "@/lib/app-url";

/** Hostname of the primary CRM app (no port). */
export function primaryAppHostname(): string {
  try {
    return new URL(getAppUrl()).hostname.toLowerCase();
  } catch {
    return "localhost";
  }
}

/** Per-shop sites subdomain target for custom-domain CNAME, e.g. joes-auto.sites.repairpilot.com */
export function customDomainCnameTarget(slug: string): string {
  const appHost = primaryAppHostname();
  if (appHost === "localhost" || appHost.startsWith("127.")) {
    return `${slug}.sites.localhost`;
  }
  return `${slug}.sites.${appHost}`;
}

export function isPrimaryAppHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0]!;
  const primary = primaryAppHostname();
  return h === primary || h === "localhost" || h.startsWith("127.");
}

/** Extract slug from {slug}.sites.{appHost} host pattern. */
export function slugFromSitesSubdomain(host: string): string | null {
  const h = host.toLowerCase().split(":")[0]!;
  const appHost = primaryAppHostname();
  const suffix = `.sites.${appHost}`;
  if (!h.endsWith(suffix)) return null;
  const slug = h.slice(0, -suffix.length);
  return slug.length > 0 ? slug : null;
}

export function normalizeCustomDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  try {
    const withProto = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return new URL(withProto).hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "").replace(/\/$/, "");
  }
}
