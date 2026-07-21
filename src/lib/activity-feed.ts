import { ShopAuditEventType, type RoActivityType } from "@/generated/prisma";
import {
  dashboardPeriodLabel,
  parseDashboardPeriod,
  type DashboardDateRange,
  type DashboardPeriod,
} from "@/lib/dashboard";
import { shopAuditEventLabel } from "@/lib/shop-audit-display";

/** Shop Activity defaults to Today (unlike KPIs which default to MTD). */
export const ACTIVITY_FEED_DEFAULT_RANGE: DashboardDateRange = "today";
export const ACTIVITY_FEED_PAGE_SIZE = 10;

export type ActivityFeedCategory =
  | "customer_viewed"
  | "estimate"
  | "ro_status"
  | "payment"
  | "activity"
  | "appointment"
  | "customer"
  | "sms"
  | "other";

export const ACTIVITY_FEED_CATEGORIES: ActivityFeedCategory[] = [
  "customer_viewed",
  "estimate",
  "ro_status",
  "payment",
  "activity",
  "appointment",
  "customer",
  "sms",
  "other",
];

export const ACTIVITY_FEED_CATEGORY_LABELS: Record<ActivityFeedCategory, string> = {
  customer_viewed: "Customer Viewed",
  estimate: "Estimate",
  ro_status: "RO Status",
  payment: "Payment",
  activity: "Activity",
  appointment: "Appointment",
  customer: "Customer",
  sms: "SMS",
  other: "Other",
};

/** Pill tint classes — ShopRally navy / light-blue / red, not competitor teal. */
export const ACTIVITY_FEED_CATEGORY_PILL: Record<ActivityFeedCategory, string> = {
  customer_viewed: "bg-brand-light/25 text-brand-navy border-brand-light/50",
  estimate: "bg-brand-navy/10 text-brand-navy border-brand-navy/20",
  ro_status: "bg-amber-50 text-amber-900 border-amber-200",
  payment: "bg-emerald-50 text-emerald-800 border-emerald-200",
  activity: "bg-slate-100 text-slate-700 border-slate-200",
  appointment: "bg-sky-50 text-sky-900 border-sky-200",
  customer: "bg-violet-50 text-violet-900 border-violet-200",
  sms: "bg-brand-red/10 text-brand-red border-brand-red/25",
  other: "bg-muted text-muted-foreground border-border",
};

export type ActivityFeedItem = {
  id: string;
  summary: string;
  category: ActivityFeedCategory;
  categoryLabel: string;
  /** ISO string after RSC serialization; Date on the server. */
  createdAt: Date | string;
  repairOrderId: string | null;
  roNumber: number | null;
  href: string | null;
};

export type ActivityFeedResult = {
  range: DashboardDateRange;
  rangeLabel: string;
  periodStart: string;
  periodEnd: string;
  items: ActivityFeedItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  q: string;
  /**
   * Active category filter. Empty = all types (no filter).
   * When set, only listed categories are included.
   */
  categories: ActivityFeedCategory[];
};

export function parseActivityFeedRange(value: string | undefined): DashboardDateRange {
  return parseDashboardPeriod({ range: value }, ACTIVITY_FEED_DEFAULT_RANGE).range;
}

export function parseActivityFeedPeriod(opts: {
  range?: string;
  period?: string;
  from?: string;
  to?: string;
}): DashboardPeriod {
  return parseDashboardPeriod(opts, ACTIVITY_FEED_DEFAULT_RANGE);
}

export function activityFeedRangeLabel(
  rangeOrPeriod: DashboardDateRange | DashboardPeriod,
): string {
  const period =
    typeof rangeOrPeriod === "string" ? { range: rangeOrPeriod } : rangeOrPeriod;
  return dashboardPeriodLabel(period);
}

/** Single category (legacy). Prefer {@link parseActivityFeedCategories}. */
export function parseActivityFeedCategory(
  value: string | undefined | null,
): ActivityFeedCategory | null {
  const multi = parseActivityFeedCategories(value);
  return multi.length === 1 ? multi[0]! : null;
}

/**
 * Parse `category` query: comma/plus-separated (`estimate,payment`) or a single value.
 * Empty / all categories selected → `[]` (no filter).
 */
export function parseActivityFeedCategories(
  value: string | undefined | null,
): ActivityFeedCategory[] {
  if (!value?.trim()) return [];
  const seen = new Set<ActivityFeedCategory>();
  for (const part of value.split(/[,+]/)) {
    const token = part.trim();
    if (ACTIVITY_FEED_CATEGORIES.includes(token as ActivityFeedCategory)) {
      seen.add(token as ActivityFeedCategory);
    }
  }
  if (seen.size === 0 || seen.size === ACTIVITY_FEED_CATEGORIES.length) return [];
  return ACTIVITY_FEED_CATEGORIES.filter((c) => seen.has(c));
}

/** URL value for the category filter, or `null` when all / no filter. */
export function serializeActivityFeedCategories(
  categories: ActivityFeedCategory[],
): string | null {
  if (categories.length === 0 || categories.length === ACTIVITY_FEED_CATEGORIES.length) {
    return null;
  }
  return categories.join(",");
}

export function parseActivityFeedPage(value: string | undefined | null): number {
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const RO_ACTIVITY_LABEL: Record<RoActivityType, string> = {
  NOTE: "Note",
  PHONE_CALL: "Phone call",
  EMAIL: "Email",
  OTHER: "Other",
};

export function roActivityCategoryLabel(type: RoActivityType): string {
  return RO_ACTIVITY_LABEL[type] ?? "Activity";
}

const PAYMENT_TYPES = new Set<ShopAuditEventType>([
  ShopAuditEventType.PAYMENT_RECORDED,
  ShopAuditEventType.PAYMENT_CHECKOUT_STARTED,
  ShopAuditEventType.PAYMENT_REFUND_REQUESTED,
  ShopAuditEventType.INVOICE_LINK_CREATED,
  ShopAuditEventType.INVOICE_LINK_REVOKED,
  ShopAuditEventType.DEPOSIT_REQUEST_CREATED,
  ShopAuditEventType.DEPOSIT_REQUEST_SENT,
  ShopAuditEventType.DEPOSIT_PAID,
]);

const CUSTOMER_TYPES = new Set<ShopAuditEventType>([
  ShopAuditEventType.CUSTOMER_CREATED,
  ShopAuditEventType.CUSTOMER_UPDATED,
  ShopAuditEventType.CUSTOMER_DELETED,
  ShopAuditEventType.CUSTOMER_ANONYMIZED,
  ShopAuditEventType.CUSTOMER_EXPORTED,
  ShopAuditEventType.CONSENT_GRANTED,
  ShopAuditEventType.CONSENT_REVOKED,
  ShopAuditEventType.MARKETING_OPT_IN_CHANGED,
]);

const ESTIMATE_TYPES = new Set<ShopAuditEventType>([
  ShopAuditEventType.ESTIMATE_JOB_ADDED,
  ShopAuditEventType.ESTIMATE_JOB_UPDATED,
  ShopAuditEventType.ESTIMATE_JOB_DELETED,
  ShopAuditEventType.ESTIMATE_JOB_SAVED,
  ShopAuditEventType.ESTIMATE_LINE_ADDED,
  ShopAuditEventType.ESTIMATE_LINE_UPDATED,
  ShopAuditEventType.ESTIMATE_LINE_DELETED,
  ShopAuditEventType.ESTIMATE_FEE_ADDED,
  ShopAuditEventType.ESTIMATE_FEE_UPDATED,
  ShopAuditEventType.ESTIMATE_FEE_DELETED,
  ShopAuditEventType.ESTIMATE_DISCOUNT_ADDED,
  ShopAuditEventType.ESTIMATE_DISCOUNT_UPDATED,
  ShopAuditEventType.ESTIMATE_DISCOUNT_DELETED,
  ShopAuditEventType.ESTIMATE_APPROVED_BY_CUSTOMER,
  ShopAuditEventType.ESTIMATE_LINK_CREATED,
  ShopAuditEventType.ESTIMATE_LINK_REVOKED,
  ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED,
]);

export function categoryForAuditEvent(
  eventType: ShopAuditEventType,
  summary: string,
): ActivityFeedCategory {
  if (eventType === ShopAuditEventType.RO_CREATED) return "ro_status";
  if (eventType === ShopAuditEventType.RO_ACTIVITY_ADDED) return "activity";
  if (eventType === ShopAuditEventType.SMS_SENT) return "sms";
  if (eventType === ShopAuditEventType.APPOINTMENT_UPDATED) return "appointment";
  if (PAYMENT_TYPES.has(eventType)) return "payment";
  if (CUSTOMER_TYPES.has(eventType)) return "customer";
  if (eventType === ShopAuditEventType.ESTIMATE_AUTHORIZATION_CHANGED) {
    // Board moves / archive / approve→WIP are workflow status, not estimate line edits.
    if (
      /moved on job board/i.test(summary) ||
      /archived from job board/i.test(summary) ||
      /started work/i.test(summary)
    ) {
      return "ro_status";
    }
  }
  if (ESTIMATE_TYPES.has(eventType)) return "estimate";
  if (
    eventType === ShopAuditEventType.CAMPAIGN_LAUNCHED ||
    eventType === ShopAuditEventType.SETTINGS_CHANGED ||
    eventType === ShopAuditEventType.EMPLOYEE_ROLE_CHANGED ||
    eventType === ShopAuditEventType.RETENTION_JOB_RUN ||
    eventType === ShopAuditEventType.DSAR_EXPORT
  ) {
    return "other";
  }
  return "other";
}

export function auditEventSummary(
  eventType: ShopAuditEventType,
  summary: string,
): string {
  const trimmed = summary.trim();
  if (trimmed) return trimmed;
  return shopAuditEventLabel(eventType);
}
