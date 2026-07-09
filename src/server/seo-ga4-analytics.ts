import "server-only";

import type { SeoGa4AnalyticsView } from "@/lib/seo-ga4-analytics";
import { ga4EmbedUrl } from "@/lib/seo-ga4-analytics";
import { prisma } from "@/db/client";
import { getGoogleGscIntegration } from "@/server/google-search-console";
import {
  fetchGa4AnalyticsView,
  parseCachedGa4Analytics,
} from "@/server/services/seo-ga4-data";
import { ensureGscAccessToken } from "@/server/services/google-search-console";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

export async function getSeoGa4AnalyticsForShop(
  shopId: string,
  measurementId: string | null,
  gscConnected: boolean,
): Promise<SeoGa4AnalyticsView> {
  return loadSeoGa4AnalyticsForShop(shopId, measurementId, gscConnected, false);
}

/** Force-refresh GA4 metrics cache (nightly job). */
export async function refreshShopGa4MetricsCache(
  shopId: string,
  measurementId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const view = await loadSeoGa4AnalyticsForShop(shopId, measurementId, true, true);
  return view.available ? { ok: true } : { ok: false, error: view.reason ?? "GA4 refresh failed." };
}

async function loadSeoGa4AnalyticsForShop(
  shopId: string,
  measurementId: string | null,
  gscConnected: boolean,
  forceRefresh: boolean,
): Promise<SeoGa4AnalyticsView> {
  const trimmed = measurementId?.trim() ?? "";
  if (!trimmed) {
    return emptyGa4("Add a GA4 measurement ID in ShopSite to track site visits.");
  }

  if (!gscConnected) {
    return {
      ...emptyGa4(
        "Connect Google (Search Console) on the Sites tab — the same login grants Analytics read access.",
        trimmed,
      ),
      embedUrl: ga4EmbedUrl(null, trimmed),
    };
  }

  const settings = await prisma.shopSeoSettings.findUnique({
    where: { shopId },
    select: {
      ga4PropertyId: true,
      ga4MetricsCache: true,
      ga4MetricsCachedAt: true,
    },
  });

  const cachedAt = settings?.ga4MetricsCachedAt;
  const cacheFresh =
    !forceRefresh &&
    cachedAt != null &&
    Date.now() - cachedAt.getTime() < CACHE_TTL_MS;
  if (cacheFresh && settings?.ga4MetricsCache) {
    const parsed = parseCachedGa4Analytics(settings.ga4MetricsCache);
    if (parsed) {
      return {
        ...parsed,
        measurementId: parsed.measurementId ?? trimmed,
        cachedAt: cachedAt.toISOString(),
      };
    }
  }

  try {
    const integration = await getGoogleGscIntegration(shopId);
    const tokens = await ensureGscAccessToken(integration.config);
    const { view, resolvedPropertyId } = await fetchGa4AnalyticsView({
      accessToken: tokens.accessToken,
      measurementId: trimmed,
      propertyId: settings?.ga4PropertyId ?? null,
    });

    if (view.available) {
      await prisma.shopSeoSettings.upsert({
        where: { shopId },
        create: {
          shopId,
          ga4PropertyId: resolvedPropertyId,
          ga4MetricsCache: view as object,
          ga4MetricsCachedAt: new Date(),
        },
        update: {
          ...(resolvedPropertyId ? { ga4PropertyId: resolvedPropertyId } : {}),
          ga4MetricsCache: view as object,
          ga4MetricsCachedAt: new Date(),
        },
      });
    }

    return view;
  } catch (err) {
    const stale = settings?.ga4MetricsCache
      ? parseCachedGa4Analytics(settings.ga4MetricsCache)
      : null;
    if (stale) {
      return {
        ...stale,
        measurementId: stale.measurementId ?? trimmed,
        cachedAt: cachedAt?.toISOString() ?? null,
        reason: "Showing cached GA4 data — live refresh failed.",
      };
    }
    return emptyGa4(err instanceof Error ? err.message : "GA4 data unavailable.", trimmed);
  }
}
