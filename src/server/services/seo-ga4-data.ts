import "server-only";

import { formatShortDate, pctDelta } from "@/lib/seo-analytics";
import type { SeoGa4AnalyticsView, SeoGa4DailyPoint } from "@/lib/seo-ga4-analytics";
import { ga4EmbedUrl } from "@/lib/seo-ga4-analytics";

const ANALYTICS_DAYS = 28;
const ADMIN_BASE = "https://analyticsadmin.googleapis.com/v1beta";
const DATA_BASE = "https://analyticsdata.googleapis.com/v1beta";

type RunReportRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};

function emptyGa4(reason: string | null = null, measurementId: string | null = null): SeoGa4AnalyticsView {
  return {
    available: false,
    reason,
    measurementId,
    propertyId: null,
    cachedAt: null,
    embedUrl: ga4EmbedUrl(null, measurementId),
    totals: null,
    priorTotals: null,
    sessionsDeltaPct: null,
    organicDeltaPct: null,
    daily: [],
  };
}

async function adminFetch(accessToken: string, path: string): Promise<Response> {
  return fetch(`${ADMIN_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });
}

async function dataFetch(accessToken: string, propertyId: string, body: object): Promise<Response> {
  return fetch(`${DATA_BASE}/properties/${propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
}

/** Resolve numeric GA4 property ID from a G- measurement ID via Admin API. */
export async function findGa4PropertyId(
  accessToken: string,
  measurementId: string,
): Promise<string | null> {
  let pageToken: string | undefined;
  do {
    const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    const res = await adminFetch(accessToken, `/accountSummaries${qs}`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      accountSummaries?: {
        propertySummaries?: { property?: string; displayName?: string }[];
      }[];
      nextPageToken?: string;
    };

    for (const account of json.accountSummaries ?? []) {
      for (const prop of account.propertySummaries ?? []) {
        const property = prop.property;
        if (!property?.startsWith("properties/")) continue;
        const streamsRes = await adminFetch(accessToken, `/${property}/dataStreams`);
        if (!streamsRes.ok) continue;
        const streamsJson = (await streamsRes.json()) as {
          dataStreams?: {
            webStreamData?: { measurementId?: string };
          }[];
        };
        for (const stream of streamsJson.dataStreams ?? []) {
          if (stream.webStreamData?.measurementId === measurementId) {
            return property.replace(/^properties\//, "");
          }
        }
      }
    }
    pageToken = json.nextPageToken;
  } while (pageToken);

  return null;
}

function parseMetricTotal(rows: RunReportRow[] | undefined, index = 0): number {
  const row = rows?.[0];
  const raw = row?.metricValues?.[index]?.value;
  const n = raw != null ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

async function fetchSessionTotals(
  accessToken: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  organicOnly: boolean,
): Promise<number> {
  const body: Record<string, unknown> = {
    dateRanges: [{ startDate, endDate }],
    metrics: [{ name: "sessions" }],
  };
  if (organicOnly) {
    body.dimensionFilter = {
      filter: {
        fieldName: "sessionDefaultChannelGroup",
        stringFilter: { matchType: "EXACT", value: "Organic Search" },
      },
    };
  }

  const res = await dataFetch(accessToken, propertyId, body);
  if (!res.ok) return 0;
  const json = (await res.json()) as { rows?: RunReportRow[] };
  return parseMetricTotal(json.rows);
}

async function fetchDailySessions(
  accessToken: string,
  propertyId: string,
): Promise<SeoGa4DailyPoint[]> {
  const res = await dataFetch(accessToken, propertyId, {
    dateRanges: [{ startDate: `${ANALYTICS_DAYS}daysAgo`, endDate: "yesterday" }],
    dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { rows?: RunReportRow[] };
  const byDate = new Map<string, SeoGa4DailyPoint>();

  for (const row of json.rows ?? []) {
    const rawDate = row.dimensionValues?.[0]?.value ?? "";
    const channel = row.dimensionValues?.[1]?.value ?? "";
    const sessions = parseMetricTotal([row]);
    if (!rawDate) continue;

    const iso =
      rawDate.length === 8
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
        : rawDate;

    const existing = byDate.get(iso) ?? {
      date: iso,
      label: formatShortDate(iso),
      sessions: 0,
      organicSessions: 0,
    };
    existing.sessions += sessions;
    if (channel === "Organic Search") {
      existing.organicSessions += sessions;
    }
    byDate.set(iso, existing);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchGa4AnalyticsView(input: {
  accessToken: string;
  measurementId: string;
  propertyId: string | null;
}): Promise<{ view: SeoGa4AnalyticsView; resolvedPropertyId: string | null }> {
  const { accessToken, measurementId } = input;
  let propertyId = input.propertyId;

  if (!propertyId) {
    propertyId = await findGa4PropertyId(accessToken, measurementId);
  }
  if (!propertyId) {
    return {
      view: {
        ...emptyGa4(
          "Could not match your measurement ID to a GA4 property — reconnect Google with Analytics access or open GA4 directly.",
          measurementId,
        ),
        embedUrl: ga4EmbedUrl(null, measurementId),
      },
      resolvedPropertyId: null,
    };
  }

  try {
    const [sessions, organicSessions, priorSessions, priorOrganic, daily] = await Promise.all([
      fetchSessionTotals(accessToken, propertyId, `${ANALYTICS_DAYS}daysAgo`, "yesterday", false),
      fetchSessionTotals(accessToken, propertyId, `${ANALYTICS_DAYS}daysAgo`, "yesterday", true),
      fetchSessionTotals(
        accessToken,
        propertyId,
        `${ANALYTICS_DAYS * 2}daysAgo`,
        `${ANALYTICS_DAYS + 1}daysAgo`,
        false,
      ),
      fetchSessionTotals(
        accessToken,
        propertyId,
        `${ANALYTICS_DAYS * 2}daysAgo`,
        `${ANALYTICS_DAYS + 1}daysAgo`,
        true,
      ),
      fetchDailySessions(accessToken, propertyId),
    ]);

    const view: SeoGa4AnalyticsView = {
      available: true,
      reason: null,
      measurementId,
      propertyId,
      cachedAt: new Date().toISOString(),
      embedUrl: ga4EmbedUrl(propertyId, measurementId),
      totals: {
        sessions,
        organicSessions,
        days: ANALYTICS_DAYS,
      },
      priorTotals: {
        sessions: priorSessions,
        organicSessions: priorOrganic,
      },
      sessionsDeltaPct: pctDelta(sessions, priorSessions),
      organicDeltaPct: pctDelta(organicSessions, priorOrganic),
      daily,
    };

    return { view, resolvedPropertyId: propertyId };
  } catch (err) {
    return {
      view: {
        ...emptyGa4(
          err instanceof Error ? err.message : "GA4 data unavailable.",
          measurementId,
        ),
        propertyId,
        embedUrl: ga4EmbedUrl(propertyId, measurementId),
      },
      resolvedPropertyId: propertyId,
    };
  }
}

export function parseCachedGa4Analytics(raw: unknown): SeoGa4AnalyticsView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.available !== true || !o.totals || typeof o.totals !== "object") return null;
  return raw as SeoGa4AnalyticsView;
}
