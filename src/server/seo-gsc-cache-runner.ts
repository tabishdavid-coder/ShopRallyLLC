import "server-only";

import { canUseFeature } from "@/lib/subscription";
import { getGoogleGscIntegration } from "@/server/google-search-console";
import { refreshShopGa4MetricsCache } from "@/server/seo-ga4-analytics";
import { getSeoAutomationAdmin } from "@/server/seo-automation";
import { refreshShopGscMetricsCache } from "@/server/seo-gsc-cache";
import { getWebsiteAdmin } from "@/server/website-seo";

/** Refresh GSC + GA4 analytics caches for every eligible shop. */
export async function refreshAllShopSeoMetricCaches(): Promise<{
  scanned: number;
  gscRefreshed: number;
  ga4Refreshed: number;
  skipped: number;
  failed: number;
}> {
  const integrations = await import("@/db/client").then(({ prisma }) =>
    prisma.shopIntegration.findMany({
      where: { vendorKey: "google_search_console" },
      select: { shopId: true },
    }),
  );

  let gscRefreshed = 0;
  let ga4Refreshed = 0;
  let skipped = 0;
  let failed = 0;

  for (const { shopId } of integrations) {
    try {
      const hasFeature = await canUseFeature(shopId, "website_seo");
      if (!hasFeature) {
        skipped += 1;
        continue;
      }
      const integration = await getGoogleGscIntegration(shopId);
      if (!integration.connected) {
        skipped += 1;
        continue;
      }
      const admin = await getSeoAutomationAdmin(shopId, true, false);
      const linked = admin.properties.some((p) => p.gscPropertyUrl);
      if (!linked) {
        skipped += 1;
        continue;
      }

      const gscResult = await refreshShopGscMetricsCache(shopId);
      if (gscResult.ok) gscRefreshed += 1;
      else failed += 1;

      const website = await getWebsiteAdmin(shopId, true);
      if (website.googleAnalyticsId?.trim()) {
        const ga4Result = await refreshShopGa4MetricsCache(shopId, website.googleAnalyticsId);
        if (ga4Result.ok) ga4Refreshed += 1;
      }
    } catch {
      failed += 1;
    }
  }

  return {
    scanned: integrations.length,
    gscRefreshed,
    ga4Refreshed,
    skipped,
    failed,
  };
}

/** @deprecated Use refreshAllShopSeoMetricCaches */
export async function refreshAllShopGscMetricCaches() {
  const result = await refreshAllShopSeoMetricCaches();
  return {
    scanned: result.scanned,
    refreshed: result.gscRefreshed,
    skipped: result.skipped,
    failed: result.failed,
  };
}
