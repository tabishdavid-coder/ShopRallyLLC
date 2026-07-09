import "server-only";

import { publicUrl } from "@/lib/app-url";

export const GOOGLE_GSC_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing https://www.googleapis.com/auth/analytics.readonly";
export const GOOGLE_GSC_VENDOR_KEY = "google_search_console";

const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_BASE = "https://www.googleapis.com/webmasters/v3";

export type GoogleGscOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type GoogleGscConnectionConfig = {
  refreshToken?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  /** Verified sites returned after OAuth (siteUrl keys from GSC). */
  sites?: string[];
};

export type GscSearchMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  days: number;
};

export type GscDailyRow = {
  date: string;
  clicks: number;
  impressions: number;
};

export type GscQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function googleOAuthConfig() {
  const clientId = env("GOOGLE_CLIENT_ID");
  const clientSecret = env("GOOGLE_CLIENT_SECRET");
  const redirectUri =
    env("GOOGLE_GSC_REDIRECT_URI") ?? publicUrl("/api/google/search-console/callback");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

export function isGoogleGscConfigured(): boolean {
  return googleOAuthConfig() !== null;
}

export function getGoogleGscOAuthUrl(state: string) {
  const cfg = googleOAuthConfig();
  if (!cfg) {
    return {
      ok: false as const,
      error: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Search Console.",
    };
  }
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: GOOGLE_GSC_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return { ok: true as const, url: `${OAUTH_AUTH_URL}?${params.toString()}` };
}

export async function exchangeGoogleGscCode(code: string): Promise<GoogleGscOAuthTokens> {
  const cfg = googleOAuthConfig();
  if (!cfg) throw new Error("Google OAuth is not configured.");

  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `Token exchange failed (${res.status}).`);
  }
  if (!json.refresh_token) {
    throw new Error("No refresh token returned — revoke app access in Google Account and reconnect.");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
  };
}

export async function refreshGoogleGscAccessToken(refreshToken: string): Promise<GoogleGscOAuthTokens> {
  const cfg = googleOAuthConfig();
  if (!cfg) throw new Error("Google OAuth is not configured.");

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? json.error ?? `Token refresh failed (${res.status}).`);
  }
  return {
    accessToken: json.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
  };
}

export function parseGoogleGscConfig(raw: unknown): GoogleGscConnectionConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const c = raw as Record<string, unknown>;
  const str = (k: string) => (typeof c[k] === "string" && c[k].trim() ? c[k].trim() : undefined);
  const sites = Array.isArray(c.sites)
    ? c.sites.filter((s): s is string => typeof s === "string" && s.length > 0)
    : undefined;
  return {
    refreshToken: str("refreshToken"),
    accessToken: str("accessToken"),
    tokenExpiresAt: str("tokenExpiresAt"),
    sites,
  };
}

export function isGoogleGscConnected(config: GoogleGscConnectionConfig): boolean {
  return Boolean(config.refreshToken);
}

export async function ensureGscAccessToken(
  config: GoogleGscConnectionConfig,
): Promise<GoogleGscOAuthTokens> {
  if (!config.refreshToken) throw new Error("Search Console not connected for this shop.");

  const expiresAt = config.tokenExpiresAt ? new Date(config.tokenExpiresAt) : null;
  const stillValid =
    config.accessToken && expiresAt && expiresAt.getTime() > Date.now() + 60_000;

  if (stillValid && config.accessToken) {
    return {
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      expiresAt: expiresAt!,
    };
  }

  return refreshGoogleGscAccessToken(config.refreshToken);
}

/** List verified Search Console properties for the authenticated user. */
export async function listGscSites(accessToken: string): Promise<string[]> {
  const res = await fetch(`${GSC_BASE}/sites`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as {
    siteEntry?: Array<{ siteUrl?: string; permissionLevel?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `GSC sites list failed (${res.status}).`);
  }
  return (json.siteEntry ?? [])
    .map((e) => e.siteUrl)
    .filter((url): url is string => Boolean(url));
}

function formatGscDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function gscDateRange(days: number, endOffsetDays = 0) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - endOffsetDays);
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { startDate: formatGscDate(start), endDate: formatGscDate(end) };
}

async function queryGscAnalytics(
  siteUrl: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
  error?: { message?: string };
}> {
  const encodedSite = encodeURIComponent(siteUrl);
  const res = await fetch(`${GSC_BASE}/sites/${encodedSite}/searchAnalytics/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as {
    rows?: Array<{
      keys?: string[];
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `GSC analytics query failed (${res.status}).`);
  }
  return json;
}

/** Search performance totals for a date window. */
export async function fetchGscSearchMetrics(
  siteUrl: string,
  accessToken: string,
  days = 28,
  endOffsetDays = 0,
): Promise<GscSearchMetrics> {
  const { startDate, endDate } = gscDateRange(days, endOffsetDays);
  const json = await queryGscAnalytics(siteUrl, accessToken, {
    startDate,
    endDate,
    rowLimit: 1,
  });
  const row = json.rows?.[0];
  return {
    clicks: row?.clicks ?? 0,
    impressions: row?.impressions ?? 0,
    ctr: row?.ctr ?? 0,
    position: row?.position ?? 0,
    days,
  };
}

/** Daily clicks + impressions for charting. */
export async function fetchGscDailyMetrics(
  siteUrl: string,
  accessToken: string,
  days = 28,
): Promise<GscDailyRow[]> {
  const { startDate, endDate } = gscDateRange(days);
  const json = await queryGscAnalytics(siteUrl, accessToken, {
    startDate,
    endDate,
    dimensions: ["date"],
    rowLimit: Math.min(days + 5, 400),
  });
  return (json.rows ?? [])
    .map((row) => ({
      date: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
    }))
    .filter((row) => row.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Top search queries for a property. */
export async function fetchGscTopQueries(
  siteUrl: string,
  accessToken: string,
  days = 28,
  limit = 10,
): Promise<GscQueryRow[]> {
  const { startDate, endDate } = gscDateRange(days);
  const json = await queryGscAnalytics(siteUrl, accessToken, {
    startDate,
    endDate,
    dimensions: ["query"],
    rowLimit: limit,
  });
  return (json.rows ?? [])
    .map((row) => ({
      query: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
      ctr: row.ctr ?? 0,
      position: row.position ?? 0,
    }))
    .filter((row) => row.query);
}

/** Register a sitemap URL with Search Console. */
export async function submitGscSitemap(
  siteUrl: string,
  sitemapUrl: string,
  accessToken: string,
): Promise<void> {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(sitemapUrl);
  const res = await fetch(`${GSC_BASE}/sites/${encodedSite}/sitemaps/${encodedFeed}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message ?? `GSC sitemap submit failed (${res.status}).`);
  }
}

const INDEXING_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish";

/** Request Google to recrawl a URL (Indexing API — requires indexing scope + GSC ownership). */
export async function publishUrlToGoogleIndexing(
  pageUrl: string,
  accessToken: string,
  type: "URL_UPDATED" | "URL_DELETED" = "URL_UPDATED",
): Promise<void> {
  const res = await fetch(INDEXING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: pageUrl, type }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(json.error?.message ?? `Indexing API failed (${res.status}).`);
  }
}

/** Top landing pages from Search Console. */
export async function fetchGscTopPages(
  siteUrl: string,
  accessToken: string,
  days = 28,
  limit = 8,
): Promise<{ page: string; clicks: number; impressions: number }[]> {
  const { startDate, endDate } = gscDateRange(days);
  const json = await queryGscAnalytics(siteUrl, accessToken, {
    startDate,
    endDate,
    dimensions: ["page"],
    rowLimit: limit,
  });
  return (json.rows ?? [])
    .map((row) => ({
      page: row.keys?.[0] ?? "",
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
    }))
    .filter((row) => row.page);
}

/** Pick the best GSC property URL for a hostname. */
export function matchGscSiteForHost(sites: string[], hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const candidates = [
    `sc-domain:${host}`,
    `https://${host}/`,
    `https://www.${host}/`,
    `http://${host}/`,
  ];
  for (const c of candidates) {
    if (sites.includes(c)) return c;
  }
  return sites.find((s) => s.toLowerCase().includes(host)) ?? null;
}
