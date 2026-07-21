import "server-only";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import {
  ACTIVITY_FEED_CATEGORY_LABELS,
  ACTIVITY_FEED_DEFAULT_RANGE,
  ACTIVITY_FEED_PAGE_SIZE,
  activityFeedRangeLabel,
  auditEventSummary,
  categoryForAuditEvent,
  parseActivityFeedCategories,
  parseActivityFeedPage,
  parseActivityFeedPeriod,
  roActivityCategoryLabel,
  type ActivityFeedCategory,
  type ActivityFeedItem,
  type ActivityFeedResult,
} from "@/lib/activity-feed";
import { parseLocalDateInput, type DashboardPeriod } from "@/lib/dashboard";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function resolvePeriod(
  period: DashboardPeriod,
  now = new Date(),
): { start: Date; end: Date } {
  if (period.range === "custom" && period.from && period.to) {
    const fromDate = parseLocalDateInput(period.from);
    const toDate = parseLocalDateInput(period.to);
    if (fromDate && toDate) {
      return { start: startOfDay(fromDate), end: endOfDay(toDate) };
    }
  }

  const range =
    period.range === "custom" ? ACTIVITY_FEED_DEFAULT_RANGE : period.range;
  const end = now;
  switch (range) {
    case "today":
      return { start: startOfDay(now), end };
    case "7d":
      return { start: startOfDay(addDays(now, -6)), end };
    case "30d":
      return { start: startOfDay(addDays(now, -29)), end };
    case "mtd":
      return { start: startOfMonth(now), end };
    case "custom":
      return { start: startOfDay(now), end };
  }
}

function roHref(roId: string | null): string | null {
  return roId ? `/repair-orders/${roId}/estimate` : null;
}

function matchesSearch(item: ActivityFeedItem, q: string): boolean {
  if (!q) return true;
  const hay = [
    item.summary,
    item.categoryLabel,
    item.roNumber != null ? String(item.roNumber) : "",
    item.roNumber != null ? `#${item.roNumber}` : "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

/**
 * Shop Activity — merges audit events, manual RO activities,
 * customer estimate views, and appointment bookings. No inventory events.
 */
export async function getActivityFeed(
  shopId: string,
  opts: {
    range?: string;
    period?: string;
    from?: string;
    to?: string;
    q?: string;
    category?: string | null;
    page?: string | null;
  } = {},
): Promise<ActivityFeedResult> {
  const period = parseActivityFeedPeriod({
    range: opts.range,
    period: opts.period,
    from: opts.from,
    to: opts.to,
  });
  const { start, end } = resolvePeriod(period);
  const range = period.range;
  const q = (opts.q ?? "").trim().toLowerCase();
  const categories = parseActivityFeedCategories(opts.category);
  const categorySet = categories.length > 0 ? new Set(categories) : null;
  const page = parseActivityFeedPage(opts.page);
  const pageSize = ACTIVITY_FEED_PAGE_SIZE;

  const createdInRange = { gte: start, lte: end };

  const [auditRows, activityRows, viewedRos, appointments] = await Promise.all([
    prisma.shopAuditEvent.findMany({
      where: {
        shopId,
        createdAt: createdInRange,
        eventType: { not: ShopAuditEventType.RO_ACTIVITY_ADDED },
      },
      select: {
        id: true,
        eventType: true,
        summary: true,
        createdAt: true,
        repairOrderId: true,
        repairOrder: { select: { number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 800,
    }),
    prisma.roActivity.findMany({
      where: { shopId, createdAt: createdInRange },
      select: {
        id: true,
        type: true,
        description: true,
        createdAt: true,
        repairOrderId: true,
        repairOrder: { select: { number: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    }),
    prisma.repairOrder.findMany({
      where: {
        shopId,
        estimateViewedAt: { not: null, gte: start, lte: end },
      },
      select: {
        id: true,
        number: true,
        estimateViewedAt: true,
        customer: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { estimateViewedAt: "desc" },
      take: 200,
    }),
    prisma.appointment.findMany({
      where: { shopId, createdAt: createdInRange },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        repairOrderId: true,
        customer: { select: { firstName: true, lastName: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  // Appointment has repairOrderId but no Prisma relation — resolve RO# in one batch.
  const apptRoIds = [
    ...new Set(
      appointments
        .map((a) => a.repairOrderId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const apptRoNumberById = new Map<string, number>();
  if (apptRoIds.length > 0) {
    const apptRos = await prisma.repairOrder.findMany({
      where: { shopId, id: { in: apptRoIds } },
      select: { id: true, number: true },
    });
    for (const ro of apptRos) apptRoNumberById.set(ro.id, ro.number);
  }

  const items: ActivityFeedItem[] = [];

  for (const row of auditRows) {
    const cat = categoryForAuditEvent(row.eventType, row.summary);
    items.push({
      id: `audit:${row.id}`,
      summary: auditEventSummary(row.eventType, row.summary),
      category: cat,
      categoryLabel: ACTIVITY_FEED_CATEGORY_LABELS[cat],
      createdAt: row.createdAt,
      repairOrderId: row.repairOrderId,
      roNumber: row.repairOrder?.number ?? null,
      href: roHref(row.repairOrderId),
    });
  }

  for (const row of activityRows) {
    const cat: ActivityFeedCategory = "activity";
    const typeLabel = roActivityCategoryLabel(row.type);
    items.push({
      id: `manual:${row.id}`,
      summary: row.description.trim() || typeLabel,
      category: cat,
      categoryLabel: typeLabel,
      createdAt: row.createdAt,
      repairOrderId: row.repairOrderId,
      roNumber: row.repairOrder?.number ?? null,
      href: roHref(row.repairOrderId),
    });
  }

  for (const ro of viewedRos) {
    if (!ro.estimateViewedAt) continue;
    const who =
      ro.customer.company?.trim() ||
      [ro.customer.firstName, ro.customer.lastName].filter(Boolean).join(" ").trim() ||
      "Customer";
    items.push({
      id: `viewed:${ro.id}`,
      summary: `${who} viewed the estimate`,
      category: "customer_viewed",
      categoryLabel: ACTIVITY_FEED_CATEGORY_LABELS.customer_viewed,
      createdAt: ro.estimateViewedAt,
      repairOrderId: ro.id,
      roNumber: ro.number,
      href: roHref(ro.id),
    });
  }

  for (const appt of appointments) {
    const who =
      appt.customer?.company?.trim() ||
      [appt.customer?.firstName, appt.customer?.lastName].filter(Boolean).join(" ").trim();
    const title = appt.title?.trim() || "Appointment";
    const roNumber = appt.repairOrderId
      ? (apptRoNumberById.get(appt.repairOrderId) ?? null)
      : null;
    items.push({
      id: `appt:${appt.id}`,
      summary: who ? `Appointment booked: ${title} — ${who}` : `Appointment booked: ${title}`,
      category: "appointment",
      categoryLabel: ACTIVITY_FEED_CATEGORY_LABELS.appointment,
      createdAt: appt.createdAt,
      repairOrderId: appt.repairOrderId,
      roNumber,
      href: appt.repairOrderId ? roHref(appt.repairOrderId) : "/appointments",
    });
  }

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const filtered = items.filter((item) => {
    if (categorySet && !categorySet.has(item.category)) return false;
    return matchesSearch(item, q);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  return {
    range,
    rangeLabel: activityFeedRangeLabel(period),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    items: pageItems,
    total,
    page: safePage,
    pageSize,
    totalPages,
    q: opts.q?.trim() ?? "",
    categories,
  };
}
