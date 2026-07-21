/** Client-safe dashboard types and helpers (no server imports). */

export const DASHBOARD_RANGES = ["today", "7d", "30d", "mtd", "custom"] as const;
export type DashboardDateRange = (typeof DASHBOARD_RANGES)[number];

/** Preset chips only (excludes custom). */
export const DASHBOARD_PRESET_RANGES = ["today", "7d", "30d", "mtd"] as const;
export type DashboardPresetRange = (typeof DASHBOARD_PRESET_RANGES)[number];

/** Default period for the KPI / Performance dashboard. */
export const DASHBOARD_DEFAULT_RANGE: DashboardDateRange = "mtd";

/** Inclusive max span for custom dashboard ranges. */
export const DASHBOARD_MAX_CUSTOM_DAYS = 366;

export const DASHBOARD_RANGE_LABELS: Record<DashboardDateRange, string> = {
  today: "Today",
  "7d": "This week",
  "30d": "30 days",
  mtd: "This month",
  custom: "Custom",
};

/** Absolute or preset period resolved from URL search params. */
export type DashboardPeriod = {
  range: DashboardDateRange;
  /** YYYY-MM-DD when range is custom. */
  from?: string;
  /** YYYY-MM-DD when range is custom. */
  to?: string;
};

export function parseDashboardRange(
  value: string | undefined,
  fallback: DashboardDateRange = DASHBOARD_DEFAULT_RANGE,
): DashboardDateRange {
  if (value && DASHBOARD_RANGES.includes(value as DashboardDateRange)) {
    return value as DashboardDateRange;
  }
  return fallback;
}

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC shift). */
export function parseLocalDateInput(value: string): Date | null {
  if (!DATE_INPUT_RE.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addCalendarDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Validate custom from/to: swap if inverted, clamp to max span.
 * Returns null when either date is missing/invalid.
 */
export function clampCustomDateRange(
  fromRaw: string,
  toRaw: string,
  maxDays = DASHBOARD_MAX_CUSTOM_DAYS,
): { from: string; to: string } | null {
  let fromDate = parseLocalDateInput(fromRaw.trim());
  let toDate = parseLocalDateInput(toRaw.trim());
  if (!fromDate || !toDate) return null;

  if (fromDate.getTime() > toDate.getTime()) {
    const tmp = fromDate;
    fromDate = toDate;
    toDate = tmp;
  }

  const inclusiveDays =
    Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1;
  if (inclusiveDays > maxDays) {
    fromDate = addCalendarDays(toDate, -(maxDays - 1));
  }

  return { from: toDateInputValue(fromDate), to: toDateInputValue(toDate) };
}

/** Default draft when opening Custom (last 30 calendar days through today). */
export function defaultCustomDraftRange(now = new Date()): { from: string; to: string } {
  const to = toDateInputValue(now);
  const from = toDateInputValue(addCalendarDays(now, -29));
  return { from, to };
}

export function formatDashboardCustomLabel(from: string, to: string): string {
  const a = parseLocalDateInput(from);
  const b = parseLocalDateInput(to);
  if (!a || !b) return `${from} – ${to}`;
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return `${a.toLocaleDateString("en-US", opts)} – ${b.toLocaleDateString("en-US", opts)}`;
}

export function dashboardPeriodLabel(period: DashboardPeriod): string {
  if (period.range === "custom" && period.from && period.to) {
    return formatDashboardCustomLabel(period.from, period.to);
  }
  return DASHBOARD_RANGE_LABELS[period.range];
}

/**
 * Resolve period from URL-style params. Invalid custom falls back to `fallback`.
 * Accepts `range` (canonical) or `period` as an alias for the preset/custom key.
 */
export function parseDashboardPeriod(
  params: { range?: string; period?: string; from?: string; to?: string },
  fallback: DashboardDateRange = DASHBOARD_DEFAULT_RANGE,
): DashboardPeriod {
  const raw = params.range ?? params.period;
  const range = parseDashboardRange(raw, fallback);
  if (range !== "custom") {
    return { range };
  }
  const clamped = clampCustomDateRange(params.from ?? "", params.to ?? "");
  if (!clamped) {
    return { range: fallback === "custom" ? DASHBOARD_DEFAULT_RANGE : fallback };
  }
  return { range: "custom", from: clamped.from, to: clamped.to };
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
  /** Appointments created (booked) in the selected period. */
  appointmentsBookedInPeriod: number;
  tireOrdersPending: number;
  invoicedCents: number;
  collectedCents: number;
  /** ROs created in period that are still ESTIMATE. */
  estimatesPendingInPeriod: number;
  /** ROs whose authorizedAt falls in the period. */
  estimatesApprovedInPeriod: number;
  /** ROs created in the period (denominator for conversion). */
  estimatesCreatedInPeriod: number;
  /** Approved / created in period (null when none created). */
  estimateConversionPct: number | null;
  /** Labor + parts subtotals on completed/invoiced ROs in period. */
  laborSalesCents: number;
  partsSalesCents: number;
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

export function estimateConversionPct(
  approvedInPeriod: number,
  createdInPeriod: number,
): number | null {
  if (createdInPeriod <= 0) return null;
  return Math.round((approvedInPeriod / createdInPeriod) * 100);
}

/** Parts share of parts+labor sales (0–100), or null when both are zero. */
export function partsLaborMixPct(partsCents: number, laborCents: number): number | null {
  const total = partsCents + laborCents;
  if (total <= 0) return null;
  return Math.round((partsCents / total) * 100);
}
