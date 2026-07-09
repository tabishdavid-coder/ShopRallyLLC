import "server-only";

import type { SeoAnalyticsView } from "@/lib/seo-analytics";
import { formatShortDate, pctDelta } from "@/lib/seo-analytics";
import type { SeoAutomationAdmin } from "@/lib/seo-automation";
import { prisma } from "@/db/client";
import { getGoogleGscIntegration } from "@/server/google-search-console";
import { getSeoAutomationAdmin } from "@/server/seo-automation";
import {
  ensureGscAccessToken,
  fetchGscDailyMetrics,
  fetchGscSearchMetrics,
  fetchGscTopPages,
  fetchGscTopQueries,
} from "@/server/services/google-search-console";

const ANALYTICS_DAYS = 28;

function pickGscPropertyUrl(admin: SeoAutomationAdmin): string | null {
  const linked = admin.properties.find((p) => p.gscPropertyUrl);
  return linked?.gscPropertyUrl ?? null;
}

/** Force-refresh GSC metrics cache for one shop (used by nightly job). */
export async function refreshShopGscMetricsCache(
  shopId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await getSeoAutomationAdmin(shopId, true, false);
  const propertyUrl = pickGscPropertyUrl(admin);
  if (!propertyUrl) {
    return { ok: false, error: "No linked GSC property." };
  }

  try {
    const integration = await getGoogleGscIntegration(shopId);
    if (!integration.connected) {
      return { ok: false, error: "Search Console not connected." };
    }
    const tokens = await ensureGscAccessToken(integration.config);
    const [totals, priorTotals, daily, topQueries, topPages] = await Promise.all([
      fetchGscSearchMetrics(propertyUrl, tokens.accessToken, ANALYTICS_DAYS),
      fetchGscSearchMetrics(propertyUrl, tokens.accessToken, ANALYTICS_DAYS, ANALYTICS_DAYS),
      fetchGscDailyMetrics(propertyUrl, tokens.accessToken, ANALYTICS_DAYS),
      fetchGscTopQueries(propertyUrl, tokens.accessToken, ANALYTICS_DAYS, 8),
      fetchGscTopPages(propertyUrl, tokens.accessToken, ANALYTICS_DAYS, 8),
    ]);

    const result: SeoAnalyticsView = {
      available: true,
      propertyUrl,
      reason: null,
      cachedAt: new Date().toISOString(),
      totals,
      priorTotals: {
        clicks: priorTotals.clicks,
        impressions: priorTotals.impressions,
      },
      clicksDeltaPct: pctDelta(totals.clicks, priorTotals.clicks),
      impressionsDeltaPct: pctDelta(totals.impressions, priorTotals.impressions),
      daily: daily.map((row) => ({
        date: row.date,
        label: formatShortDate(row.date),
        clicks: row.clicks,
        impressions: row.impressions,
      })),
      topQueries,
      topPages,
    };

    await prisma.shopSeoSettings.upsert({
      where: { shopId },
      create: {
        shopId,
        gscMetricsCache: result as object,
        gscMetricsCachedAt: new Date(),
      },
      update: {
        gscMetricsCache: result as object,
        gscMetricsCachedAt: new Date(),
      },
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Cache refresh failed.",
    };
  }
}
