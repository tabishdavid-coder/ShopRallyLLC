/** GA4 Data API view model for SEO Autopilot Analytics tab. */

export type SeoGa4DailyPoint = {
  date: string;
  label: string;
  sessions: number;
  organicSessions: number;
};

export type SeoGa4AnalyticsView = {
  available: boolean;
  reason: string | null;
  measurementId: string | null;
  propertyId: string | null;
  cachedAt: string | null;
  /** Link to GA4 when measurement ID is set but live API data is unavailable. */
  embedUrl: string | null;
  totals: {
    sessions: number;
    organicSessions: number;
    days: number;
  } | null;
  priorTotals: {
    sessions: number;
    organicSessions: number;
  } | null;
  sessionsDeltaPct: number | null;
  organicDeltaPct: number | null;
  daily: SeoGa4DailyPoint[];
};

export function ga4EmbedUrl(propertyId: string | null, measurementId: string | null): string | null {
  if (propertyId) {
    return `https://analytics.google.com/analytics/web/#/p${propertyId}/reports/intelligenthome`;
  }
  if (measurementId) {
    return "https://analytics.google.com/";
  }
  return null;
}
