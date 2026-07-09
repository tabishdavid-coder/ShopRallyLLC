import "server-only";

import { cache } from "react";

import type { SeoAnalyticsView } from "@/lib/seo-analytics";
import { formatShortDate, pctDelta } from "@/lib/seo-analytics";
import type { SeoCrmOutcomesView, SeoSiteTrafficView } from "@/lib/seo-crm-outcomes";
import type { SeoAutomationAdmin } from "@/lib/seo-automation";
import { prisma } from "@/db/client";
import type { SeoStripeCatalogId } from "@/lib/seo-stripe-products";
import { resolveSeoStripePriceId } from "@/lib/seo-stripe-products";
import { PLANS, WEB_PRESENCE_SERVICES, billingStatusLabel, webPresenceSetupFootnote } from "@/lib/plans";
import { getShopId } from "@/lib/shop";
import { canUseFeature, getShopSubscription } from "@/lib/subscription";
import { getGoogleGscIntegration } from "@/server/google-search-console";
import type { SeoGa4AnalyticsView } from "@/lib/seo-ga4-analytics";
import { getSeoCrmOutcomes } from "@/server/seo-crm-outcomes";
import { getSeoGa4AnalyticsForShop } from "@/server/seo-ga4-analytics";
import { listSeoReportSnapshots } from "@/server/seo-reports";
import type { SeoReportSnapshotView } from "@/server/seo-reports";
import { getSeoAutomationAdmin } from "@/server/seo-automation";
import {
  ensureGscAccessToken,
  fetchGscDailyMetrics,
  fetchGscSearchMetrics,
  fetchGscTopPages,
  fetchGscTopQueries,
} from "@/server/services/google-search-console";
import { getWebsiteAdmin } from "@/server/website-seo";

const ANALYTICS_DAYS = 28;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function pickGscPropertyUrl(admin: SeoAutomationAdmin): string | null {
  const linked = admin.properties.find((p) => p.gscPropertyUrl);
  return linked?.gscPropertyUrl ?? null;
}

function emptyAnalytics(reason: string | null = null): SeoAnalyticsView {
  return {
    available: false,
    propertyUrl: null,
    reason,
    cachedAt: null,
    totals: null,
    priorTotals: null,
    clicksDeltaPct: null,
    impressionsDeltaPct: null,
    daily: [],
    topQueries: [],
    topPages: [],
  };
}

function parseCachedAnalytics(raw: unknown): SeoAnalyticsView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.available !== true || !o.totals || typeof o.totals !== "object") return null;
  return raw as SeoAnalyticsView;
}

async function fetchLiveGscAnalytics(
  shopId: string,
  propertyUrl: string,
): Promise<SeoAnalyticsView> {
  const integration = await getGoogleGscIntegration(shopId);
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

  return result;
}

export async function getSeoAnalyticsForShop(
  shopId: string,
  admin: SeoAutomationAdmin,
): Promise<SeoAnalyticsView> {
  if (!admin.gsc.connected) {
    return emptyAnalytics("Connect Google Search Console to see search traffic.");
  }

  const propertyUrl = pickGscPropertyUrl(admin);
  if (!propertyUrl) {
    return emptyAnalytics("Link a site to a Search Console property on the Sites tab.");
  }

  const settings = await prisma.shopSeoSettings.findUnique({
    where: { shopId },
    select: { gscMetricsCache: true, gscMetricsCachedAt: true },
  });
  const cachedAt = settings?.gscMetricsCachedAt;
  const cacheFresh =
    cachedAt != null && Date.now() - cachedAt.getTime() < CACHE_TTL_MS;
  if (cacheFresh && settings?.gscMetricsCache) {
    const parsed = parseCachedAnalytics(settings.gscMetricsCache);
    if (parsed) {
      return {
        ...parsed,
        propertyUrl: parsed.propertyUrl ?? propertyUrl,
        cachedAt: cachedAt.toISOString(),
      };
    }
  }

  try {
    return await fetchLiveGscAnalytics(shopId, propertyUrl);
  } catch (err) {
    const stale = settings?.gscMetricsCache
      ? parseCachedAnalytics(settings.gscMetricsCache)
      : null;
    if (stale) {
      return {
        ...stale,
        propertyUrl: stale.propertyUrl ?? propertyUrl,
        cachedAt: cachedAt?.toISOString() ?? null,
        reason: "Showing cached data — live refresh failed.",
      };
    }
    return {
      ...emptyAnalytics(err instanceof Error ? err.message : "Search Console data unavailable."),
      propertyUrl,
    };
  }
}

export type SeoAutopilotPlanView = {
  planName: string;
  billingLabel: string;
  hasWebsiteSeo: boolean;
  hasAiSeoContent: boolean;
  stripeCheckoutEnabled: boolean;
  services: {
    id: string;
    catalogId: SeoStripeCatalogId | null;
    checkoutAvailable: boolean;
    name: string;
    priceLabel: string;
    description: string;
    status: "included" | "active" | "available" | "upgrade";
    statusLabel: string;
  }[];
};

export async function getSeoAutopilotPlanView(
  shopId: string,
  hasShopSite: boolean,
  hasWebsiteSeo: boolean,
  hasAiSeoContent: boolean,
): Promise<SeoAutopilotPlanView> {
  const sub = await getShopSubscription(shopId);
  const plan = PLANS[sub.plan];
  const isElite = sub.plan === "ENTERPRISE";

  const shopsiteMonthly = WEB_PRESENCE_SERVICES.find((s) => s.id === "shopsite-monthly");
  const seoMonthly = WEB_PRESENCE_SERVICES.find((s) => s.id === "seo-monthly");
  const webSeoBundle = WEB_PRESENCE_SERVICES.find((s) => s.id === "web-seo-bundle-monthly");

  const serviceCatalogMap: Record<string, SeoStripeCatalogId | null> = {
    "shopsite-monthly": "shopsite-monthly",
    "seo-monthly": "seo-monthly",
    "web-seo-bundle-monthly": "web-seo-bundle-monthly",
  };

  const stripeCheckoutEnabled = Boolean(process.env.STRIPE_SECRET_KEY?.trim());

  const services = [
    {
      id: "shopsite-monthly",
      catalogId: serviceCatalogMap["shopsite-monthly"],
      name: shopsiteMonthly?.name ?? "ShopSite",
      priceLabel: isElite
        ? "Included"
        : `${shopsiteMonthly?.priceLabel ?? "$59/mo"} · ${webPresenceSetupFootnote(shopsiteMonthly?.setupCents ?? 34900)}`,
      description: shopsiteMonthly?.description ?? "",
      status: hasShopSite
        ? ("active" as const)
        : isElite
          ? ("included" as const)
          : ("available" as const),
    },
    {
      id: "seo-monthly",
      catalogId: serviceCatalogMap["seo-monthly"],
      name: seoMonthly?.name ?? "Local SEO",
      priceLabel: isElite
        ? "Included"
        : `${seoMonthly?.priceLabel ?? "$79/mo"} · ${webPresenceSetupFootnote(seoMonthly?.setupCents ?? 29900)}`,
      description: seoMonthly?.description ?? "",
      status: hasWebsiteSeo
        ? ("active" as const)
        : isElite
          ? ("included" as const)
          : ("available" as const),
    },
    {
      id: "web-seo-bundle-monthly",
      catalogId: serviceCatalogMap["web-seo-bundle-monthly"],
      name: webSeoBundle?.name ?? "Website + SEO bundle",
      priceLabel: isElite
        ? "Included"
        : `${webSeoBundle?.priceLabel ?? "$119/mo"} · ${webPresenceSetupFootnote(webSeoBundle?.setupCents ?? 54900)}`,
      description: webSeoBundle?.description ?? "",
      status:
        hasShopSite && hasWebsiteSeo
          ? ("active" as const)
          : isElite
            ? ("included" as const)
            : ("available" as const),
    },
    {
      id: "ai-seo",
      name: "AI content refinement",
      priceLabel: `${PLANS.ENTERPRISE.name} only`,
      description: "Bi-weekly AI-enhanced meta tags, service blurbs, and keywords.",
      status: hasAiSeoContent ? ("active" as const) : ("upgrade" as const),
    },
    {
      id: "monthly-report",
      name: "Monthly email report",
      priceLabel: "Included with Local SEO",
      description: "Score, activity summary, and GSC clicks sent on the 1st.",
      status: hasWebsiteSeo ? ("active" as const) : ("upgrade" as const),
    },
  ].map((row) => ({
    id: row.id,
    catalogId: row.catalogId ?? null,
    checkoutAvailable:
      stripeCheckoutEnabled &&
      row.catalogId != null &&
      resolveSeoStripePriceId(row.catalogId) != null &&
      (row.status === "available" || row.status === "upgrade"),
    name: row.name,
    priceLabel: row.priceLabel,
    description: row.description,
    status: row.status,
    statusLabel:
      row.status === "included"
        ? "Included"
        : row.status === "active"
          ? "Active"
          : row.status === "upgrade"
            ? "Upgrade"
            : "Available add-on",
  }));

  return {
    planName: plan.name,
    billingLabel: billingStatusLabel(sub.billingStatus),
    hasWebsiteSeo,
    hasAiSeoContent,
    stripeCheckoutEnabled,
    services,
  };
}

export type SeoAutopilotPageData = {
  admin: SeoAutomationAdmin;
  analytics: SeoAnalyticsView;
  ga4Analytics: SeoGa4AnalyticsView;
  crmOutcomes: SeoCrmOutcomesView;
  siteTraffic: SeoSiteTrafficView;
  reports: SeoReportSnapshotView[];
  website: Awaited<ReturnType<typeof getWebsiteAdmin>>;
  plan: SeoAutopilotPlanView;
};

export const loadSeoAutopilotPageData = cache(async (): Promise<SeoAutopilotPageData> => {
  const shopId = await getShopId();
  const [hasShopSite, hasWebsiteSeo, hasAiSeoContent] = await Promise.all([
    canUseFeature(shopId, "shop_site"),
    canUseFeature(shopId, "website_seo"),
    canUseFeature(shopId, "ai_seo_content"),
  ]);
  const admin = await getSeoAutomationAdmin(shopId, hasWebsiteSeo, hasAiSeoContent);
  const [analytics, website, plan, crmOutcomes, reports] = await Promise.all([
    getSeoAnalyticsForShop(shopId, admin),
    getWebsiteAdmin(shopId, hasShopSite || hasWebsiteSeo),
    getSeoAutopilotPlanView(shopId, hasShopSite, hasWebsiteSeo, hasAiSeoContent),
    getSeoCrmOutcomes(shopId),
    listSeoReportSnapshots(shopId),
  ]);
  const ga4Analytics = await getSeoGa4AnalyticsForShop(
    shopId,
    website.googleAnalyticsId,
    admin.gsc.connected,
  );
  const siteTraffic: SeoSiteTrafficView = {
    ga4MeasurementId: website.googleAnalyticsId,
    ga4Configured: Boolean(website.googleAnalyticsId?.trim()),
    sitePublished: website.published,
    siteUrl: website.siteUrl,
  };
  return { admin, analytics, ga4Analytics, crmOutcomes, siteTraffic, reports, website, plan };
});
