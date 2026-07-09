/** Client-safe dashboard types and helpers (no server imports). */

export const DASHBOARD_RANGES = ["today", "7d", "30d", "mtd"] as const;
export type DashboardDateRange = (typeof DASHBOARD_RANGES)[number];

export const DASHBOARD_RANGE_LABELS: Record<DashboardDateRange, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  mtd: "MTD",
};

export function parseDashboardRange(value: string | undefined): DashboardDateRange {
  if (value && DASHBOARD_RANGES.includes(value as DashboardDateRange)) {
    return value as DashboardDateRange;
  }
  return "30d";
}

export type TrendPoint = {
  date: string;
  label: string;
  cents: number;
};

export type StatusSlice = {
  key: string;
  label: string;
  count: number;
  color: string;
};

export type PaymentMixSlice = {
  method: string;
  label: string;
  cents: number;
  count: number;
};

export type DashboardKpis = {
  carsInShop: number;
  grossVolumeCents: number;
  grossVolumePriorCents: number;
  openRoCount: number;
  estimatesCount: number;
  wipCount: number;
  completedInPeriod: number;
  completedPrior: number;
  aroCents: number;
  aroPriorCents: number;
  outstandingArCents: number;
  appointmentsToday: number;
  appointmentsThisWeek: number;
  tireOrdersPending: number;
  invoicedCents: number;
  collectedCents: number;
};

export type DashboardData = {
  range: DashboardDateRange;
  rangeLabel: string;
  periodStart: string;
  periodEnd: string;
  priorStart: string;
  priorEnd: string;
  kpis: DashboardKpis;
  revenueTrend: TrendPoint[];
  roStatusBreakdown: StatusSlice[];
  appointmentsWeek: TrendPoint[];
  paymentMix: PaymentMixSlice[];
};

export type TrendDirection = "up" | "down" | "flat";

export function trendDirection(current: number, prior: number): TrendDirection {
  if (prior === 0 && current === 0) return "flat";
  if (current > prior) return "up";
  if (current < prior) return "down";
  return "flat";
}

export function trendPercent(current: number, prior: number): number | null {
  if (prior === 0) return current > 0 ? 100 : null;
  return Math.round(((current - prior) / prior) * 100);
}

export function collectionRatePct(invoicedCents: number, collectedCents: number): number | null {
  if (invoicedCents <= 0) return null;
  return Math.round((collectedCents / invoicedCents) * 100);
}
