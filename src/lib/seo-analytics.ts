export type SeoAnalyticsDailyPoint = {
  date: string;
  label: string;
  clicks: number;
  impressions: number;
};

export type SeoAnalyticsQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SeoAnalyticsPageRow = {
  page: string;
  clicks: number;
  impressions: number;
};

export type SeoAnalyticsView = {
  available: boolean;
  propertyUrl: string | null;
  reason: string | null;
  cachedAt: string | null;
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    days: number;
  } | null;
  priorTotals: {
    clicks: number;
    impressions: number;
  } | null;
  clicksDeltaPct: number | null;
  impressionsDeltaPct: number | null;
  daily: SeoAnalyticsDailyPoint[];
  topQueries: SeoAnalyticsQueryRow[];
  topPages: SeoAnalyticsPageRow[];
};

export function pctDelta(current: number, prior: number): number | null {
  if (prior <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - prior) / prior) * 100);
}

export function formatShortDate(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
