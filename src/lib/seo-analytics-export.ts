import { downloadCsv, toCsv } from "@/lib/csv";
import type { SeoAnalyticsView } from "@/lib/seo-analytics";
import type { SeoCrmOutcomesView } from "@/lib/seo-crm-outcomes";
import type { SeoGa4AnalyticsView } from "@/lib/seo-ga4-analytics";

export function exportSeoAnalyticsCsv(input: {
  analytics: SeoAnalyticsView;
  ga4Analytics?: SeoGa4AnalyticsView;
  crmOutcomes: SeoCrmOutcomesView;
  shopLabel?: string;
}): void {
  const { analytics, ga4Analytics, crmOutcomes, shopLabel = "shop" } = input;
  const slug = shopLabel.replace(/[^\w-]+/g, "-").toLowerCase();
  const date = new Date().toISOString().slice(0, 10);

  const rows: Array<Record<string, string | number>> = [];

  if (analytics.totals) {
    rows.push({
      section: "search_totals",
      metric: "clicks_28d",
      value: analytics.totals.clicks,
      delta_pct: analytics.clicksDeltaPct ?? "",
    });
    rows.push({
      section: "search_totals",
      metric: "impressions_28d",
      value: analytics.totals.impressions,
      delta_pct: analytics.impressionsDeltaPct ?? "",
    });
    rows.push({
      section: "search_totals",
      metric: "ctr",
      value: (analytics.totals.ctr * 100).toFixed(2),
    });
    rows.push({
      section: "search_totals",
      metric: "avg_position",
      value: analytics.totals.position.toFixed(1),
    });
  }

  for (const row of analytics.daily) {
    rows.push({
      section: "daily",
      date: row.date,
      clicks: row.clicks,
      impressions: row.impressions,
    });
  }

  for (const row of analytics.topQueries) {
    rows.push({
      section: "top_queries",
      query: row.query,
      clicks: row.clicks,
      impressions: row.impressions,
      position: row.position.toFixed(1),
    });
  }

  for (const row of analytics.topPages) {
    rows.push({
      section: "top_pages",
      page: row.page,
      clicks: row.clicks,
      impressions: row.impressions,
    });
  }

  if (ga4Analytics?.totals) {
    rows.push({
      section: "ga4_totals",
      metric: "sessions_28d",
      value: ga4Analytics.totals.sessions,
      delta_pct: ga4Analytics.sessionsDeltaPct ?? "",
    });
    rows.push({
      section: "ga4_totals",
      metric: "organic_sessions_28d",
      value: ga4Analytics.totals.organicSessions,
      delta_pct: ga4Analytics.organicDeltaPct ?? "",
    });
  }

  for (const row of ga4Analytics?.daily ?? []) {
    rows.push({
      section: "ga4_daily",
      date: row.date,
      sessions: row.sessions,
      organic_sessions: row.organicSessions,
    });
  }

  rows.push({
    section: "crm_outcomes",
    metric: "online_bookings_28d",
    value: crmOutcomes.onlineAppointments,
    delta_pct: crmOutcomes.onlineAppointmentsDeltaPct ?? "",
  });
  rows.push({
    section: "crm_outcomes",
    metric: "new_web_customers_28d",
    value: crmOutcomes.newWebCustomers,
    delta_pct: crmOutcomes.newWebCustomersDeltaPct ?? "",
  });
  rows.push({
    section: "crm_outcomes",
    metric: "web_repair_orders_28d",
    value: crmOutcomes.websiteRepairOrders,
    delta_pct: crmOutcomes.websiteRepairOrdersDeltaPct ?? "",
  });

  downloadCsv(`seo-analytics-${slug}-${date}.csv`, toCsv(rows));
}
