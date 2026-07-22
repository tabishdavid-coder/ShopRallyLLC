import "server-only";

import { prisma } from "@/db/client";
import {
  AppointmentStatus,
  ROStatus,
  type Prisma,
} from "@/generated/prisma";
import {
  DASHBOARD_DEFAULT_RANGE,
  dashboardPeriodLabel,
  estimateConversionPct,
  parseLocalDateInput,
  type DashboardData,
  type DashboardDateRange,
  type DashboardPeriod,
  type PaymentMixSlice,
  type StatusSlice,
  type TrendPoint,
} from "@/lib/dashboard";
import { getGrossVolumeCents } from "@/server/services/stripe-payments";
import { countTiresLowStock } from "@/server/tire-stock";

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

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

type PeriodBounds = {
  start: Date;
  end: Date;
  priorStart: Date;
  priorEnd: Date;
};

function normalizePeriod(
  input: DashboardDateRange | DashboardPeriod,
): DashboardPeriod {
  return typeof input === "string" ? { range: input } : input;
}

function resolvePeriod(period: DashboardPeriod, now = new Date()): PeriodBounds {
  if (period.range === "custom" && period.from && period.to) {
    const fromDate = parseLocalDateInput(period.from);
    const toDate = parseLocalDateInput(period.to);
    if (fromDate && toDate) {
      const start = startOfDay(fromDate);
      const end = endOfDay(toDate);
      const dayCount =
        Math.round((startOfDay(toDate).getTime() - start.getTime()) / 86_400_000) + 1;
      const priorEnd = endOfDay(addDays(start, -1));
      const priorStart = startOfDay(addDays(priorEnd, -(dayCount - 1)));
      return { start, end, priorStart, priorEnd };
    }
  }

  const range =
    period.range === "custom" ? DASHBOARD_DEFAULT_RANGE : period.range;
  const end = now;
  const todayStart = startOfDay(now);

  switch (range) {
    case "today": {
      const priorStart = startOfDay(addDays(now, -1));
      const priorEnd = endOfDay(addDays(now, -1));
      return { start: todayStart, end, priorStart, priorEnd };
    }
    case "7d": {
      const start = startOfDay(addDays(now, -6));
      const priorEnd = endOfDay(addDays(start, -1));
      const priorStart = startOfDay(addDays(start, -7));
      return { start, end, priorStart, priorEnd };
    }
    case "30d": {
      const start = startOfDay(addDays(now, -29));
      const priorEnd = endOfDay(addDays(start, -1));
      const priorStart = startOfDay(addDays(start, -30));
      return { start, end, priorStart, priorEnd };
    }
    case "mtd": {
      const start = startOfMonth(now);
      const dayOfMonth = now.getDate();
      const priorMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const priorStart = startOfMonth(priorMonth);
      const lastDayPriorMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      const priorDay = Math.min(dayOfMonth, lastDayPriorMonth);
      const priorEnd = endOfDay(
        new Date(priorMonth.getFullYear(), priorMonth.getMonth(), priorDay),
      );
      return { start, end, priorStart, priorEnd };
    }
    case "custom":
      // Unreachable after fallback above; satisfy exhaustiveness.
      return resolvePeriod({ range: DASHBOARD_DEFAULT_RANGE }, now);
  }
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function bucketPaymentsByDay(
  payments: Array<{ paidAt: Date; amountCents: number }>,
  start: Date,
  end: Date,
): TrendPoint[] {
  const buckets = new Map<string, number>();
  const cursor = startOfDay(start);
  const endDay = startOfDay(end);
  while (cursor <= endDay) {
    buckets.set(dateKey(cursor), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const p of payments) {
    const key = dateKey(p.paidAt);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + p.amountCents);
    }
  }
  return Array.from(buckets.entries()).map(([date, cents]) => {
    const d = new Date(date + "T12:00:00");
    return { date, label: shortLabel(d), cents };
  });
}

const RO_STATUS_COLORS: Record<string, string> = {
  ESTIMATE: "oklch(0.78 0.11 230)",
  WIP: "oklch(0.42 0.06 260)",
  COMPLETED: "oklch(0.68 0.145 230)",
  INVOICED: "oklch(0.62 0.14 162)",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  CHECK: "Check",
  OTHER: "Other",
  STORE_CREDIT: "Store credit",
};

/** Full shop dashboard payload for the selected date range. */
export async function getDashboardData(
  shopId: string,
  rangeOrPeriod: DashboardDateRange | DashboardPeriod,
): Promise<DashboardData> {
  const now = new Date();
  const period = normalizePeriod(rangeOrPeriod);
  const { start, end, priorStart, priorEnd } = resolvePeriod(period, now);
  const range = period.range === "custom" && period.from && period.to
    ? "custom"
    : period.range === "custom"
      ? DASHBOARD_DEFAULT_RANGE
      : period.range;

  const weekStart = startOfDay(now);
  const weekEnd = endOfDay(addDays(now, 6));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const completedInPeriodWhere: Prisma.RepairOrderWhereInput = {
    shopId,
    status: { in: [ROStatus.COMPLETED, ROStatus.INVOICED] },
    OR: [
      { completedAt: { gte: start, lte: end } },
      { completedAt: null, updatedAt: { gte: start, lte: end } },
    ],
  };

  const completedPriorWhere: Prisma.RepairOrderWhereInput = {
    shopId,
    status: { in: [ROStatus.COMPLETED, ROStatus.INVOICED] },
    OR: [
      { completedAt: { gte: priorStart, lte: priorEnd } },
      { completedAt: null, updatedAt: { gte: priorStart, lte: priorEnd } },
    ],
  };

  const [
    carsInShop,
    openRoGroups,
    outstandingArAgg,
    completedInPeriod,
    completedPrior,
    aroAgg,
    aroPriorAgg,
    appointmentsToday,
    appointmentsThisWeek,
    appointmentsWeekRaw,
    appointmentsBookedInPeriod,
    tiresLowStock,
    paymentsInPeriod,
    paymentsForTrend,
    paymentMixRaw,
    invoicedAgg,
    grossVolumeAgg,
    grossVolumePriorAgg,
    estimatesCreatedInPeriod,
    estimatesPendingInPeriod,
    estimatesApprovedInPeriod,
    partsLaborAgg,
  ] = await Promise.all([
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        status: { in: [ROStatus.APPROVED, ROStatus.IN_PROGRESS] },
      },
    }),
    prisma.repairOrder.groupBy({
      by: ["status"],
      where: { shopId, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: { shopId, balanceCents: { gt: 0 } },
      _sum: { balanceCents: true },
    }),
    prisma.repairOrder.count({ where: completedInPeriodWhere }),
    prisma.repairOrder.count({ where: completedPriorWhere }),
    prisma.repairOrder.aggregate({
      where: completedInPeriodWhere,
      _avg: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.repairOrder.aggregate({
      where: completedPriorWhere,
      _avg: { totalCents: true },
    }),
    prisma.appointment.count({
      where: {
        shopId,
        status: { notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW] },
        startAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.appointment.count({
      where: {
        shopId,
        status: { notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW] },
        startAt: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.appointment.findMany({
      where: {
        shopId,
        status: { notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW] },
        startAt: { gte: weekStart, lte: weekEnd },
      },
      select: { startAt: true },
    }),
    prisma.appointment.count({
      where: {
        shopId,
        status: { notIn: [AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW] },
        createdAt: { gte: start, lte: end },
      },
    }),
    countTiresLowStock(shopId),
    prisma.payment.findMany({
      where: { shopId, paidAt: { gte: start, lte: end } },
      select: { amountCents: true, method: true, paidAt: true },
    }),
    prisma.payment.findMany({
      where: { shopId, paidAt: { gte: start, lte: end } },
      select: { paidAt: true, amountCents: true },
      orderBy: { paidAt: "asc" },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { shopId, paidAt: { gte: start, lte: end } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.invoice.aggregate({
      where: {
        shopId,
        issuedAt: { gte: start, lte: end },
      },
      _sum: { totalCents: true },
    }),
    prisma.payment.aggregate({
      where: { shopId, paidAt: { gte: start, lte: end } },
      _sum: { amountCents: true },
    }),
    prisma.payment.aggregate({
      where: { shopId, paidAt: { gte: priorStart, lte: priorEnd } },
      _sum: { amountCents: true },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        status: ROStatus.ESTIMATE,
        createdAt: { gte: start, lte: end },
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        authorizedAt: { gte: start, lte: end },
      },
    }),
    prisma.repairOrder.aggregate({
      where: completedInPeriodWhere,
      _sum: { laborSubtotalCents: true, partsSubtotalCents: true },
    }),
  ]);

  const statusCounts = new Map<ROStatus, number>();
  for (const g of openRoGroups) {
    statusCounts.set(g.status, g._count._all);
  }

  const estimatesCount = statusCounts.get(ROStatus.ESTIMATE) ?? 0;
  const wipCount =
    (statusCounts.get(ROStatus.APPROVED) ?? 0) + (statusCounts.get(ROStatus.IN_PROGRESS) ?? 0);
  const completedCount = statusCounts.get(ROStatus.COMPLETED) ?? 0;
  const invoicedRoCount = statusCounts.get(ROStatus.INVOICED) ?? 0;
  const openRoCount = estimatesCount + wipCount;

  const roStatusBreakdown: StatusSlice[] = [
    { key: "ESTIMATE", label: "Estimates", count: estimatesCount, color: RO_STATUS_COLORS.ESTIMATE },
    { key: "WIP", label: "Work in progress", count: wipCount, color: RO_STATUS_COLORS.WIP },
    { key: "COMPLETED", label: "Completed", count: completedCount, color: RO_STATUS_COLORS.COMPLETED },
    { key: "INVOICED", label: "Invoiced", count: invoicedRoCount, color: RO_STATUS_COLORS.INVOICED },
  ].filter((s) => s.count > 0);

  const revenueTrend = bucketPaymentsByDay(paymentsForTrend, start, end);

  const appointmentBuckets = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    appointmentBuckets.set(dateKey(d), 0);
  }
  for (const a of appointmentsWeekRaw) {
    const key = dateKey(a.startAt);
    if (appointmentBuckets.has(key)) {
      appointmentBuckets.set(key, (appointmentBuckets.get(key) ?? 0) + 1);
    }
  }
  const appointmentsWeek: TrendPoint[] = Array.from(appointmentBuckets.entries()).map(
    ([date, count]) => {
      const d = new Date(date + "T12:00:00");
      return { date, label: shortLabel(d), cents: count };
    },
  );

  const paymentMix: PaymentMixSlice[] = paymentMixRaw
    .map((p) => ({
      method: p.method,
      label: PAYMENT_METHOD_LABELS[p.method] ?? p.method,
      cents: p._sum.amountCents ?? 0,
      count: p._count._all,
    }))
    .filter((p) => p.cents > 0)
    .sort((a, b) => b.cents - a.cents);

  const grossVolumeCents = grossVolumeAgg._sum.amountCents ?? 0;
  const grossVolumePriorCents = grossVolumePriorAgg._sum.amountCents ?? 0;
  const collectedCents = paymentsInPeriod.reduce((s, p) => s + p.amountCents, 0);
  const invoicedCents = invoicedAgg._sum.totalCents ?? 0;
  const aroCents = Math.round(aroAgg._avg?.totalCents ?? 0);
  const aroPriorCents = Math.round(aroPriorAgg._avg?.totalCents ?? 0);
  const laborSalesCents = partsLaborAgg._sum?.laborSubtotalCents ?? 0;
  const partsSalesCents = partsLaborAgg._sum?.partsSubtotalCents ?? 0;

  return {
    range,
    rangeLabel: dashboardPeriodLabel(
      range === "custom" && period.from && period.to
        ? { range: "custom", from: period.from, to: period.to }
        : { range },
    ),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    priorStart: priorStart.toISOString(),
    priorEnd: priorEnd.toISOString(),
    kpis: {
      carsInShop,
      grossVolumeCents,
      grossVolumePriorCents,
      openRoCount,
      estimatesCount,
      wipCount,
      completedInPeriod,
      completedPrior,
      aroCents,
      aroPriorCents,
      outstandingArCents: outstandingArAgg._sum.balanceCents ?? 0,
      appointmentsToday,
      appointmentsThisWeek,
      appointmentsBookedInPeriod,
      tiresLowStock,
      invoicedCents,
      collectedCents,
      estimatesPendingInPeriod,
      estimatesApprovedInPeriod,
      estimatesCreatedInPeriod,
      estimateConversionPct: estimateConversionPct(
        estimatesApprovedInPeriod,
        estimatesCreatedInPeriod,
      ),
      laborSalesCents,
      partsSalesCents,
    },
    revenueTrend,
    roStatusBreakdown,
    appointmentsWeek,
    paymentMix,
  };
}

/** Legacy helper — kept for any callers expecting the old shape. */
export async function getDashboardMetrics(shopId: string) {
  const data = await getDashboardData(shopId, "30d");
  return {
    carsInShop: data.kpis.carsInShop,
    grossVolumeCents: data.kpis.grossVolumeCents,
    grossVolumeTodayCents: await getGrossVolumeCents(shopId, startOfDay(new Date())),
    openRoCount: data.kpis.openRoCount,
    completedRoCount30d: data.kpis.completedInPeriod,
  };
}
