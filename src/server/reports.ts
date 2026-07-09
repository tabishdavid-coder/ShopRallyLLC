import "server-only";

import { prisma } from "@/db/client";
import {
  PaymentMethod,
  ROStatus,
  TireOrderStatus,
} from "@/generated/prisma";
import { customerDisplayName } from "@/lib/format";
import type {
  ReportFilters,
  ReportPayload,
  ReportTechnicianOption,
} from "@/lib/reports";
import { getReportDefinition, REPORT_RANGE_LABELS } from "@/lib/reports";

export type SalesSummaryRow = {
  date: string;
  roCount: number;
  laborCents: number;
  partsCents: number;
  totalCents: number;
};

export type ArAgingRow = {
  invoiceNumber: number;
  roNumber: number;
  customerName: string;
  balanceCents: number;
  daysOutstanding: number;
  bucket: string;
};

export type TechHoursRow = {
  technicianName: string;
  jobCount: number;
  hours: number;
  laborCents: number;
};

const POSTED_STATUSES: ROStatus[] = [ROStatus.COMPLETED, ROStatus.INVOICED];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  CHECK: "Check",
  OTHER: "Other",
  STORE_CREDIT: "Store credit",
};

const RO_STATUS_LABELS: Record<ROStatus, string> = {
  ESTIMATE: "Estimate",
  APPROVED: "Approved",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
};

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

type PeriodBounds = { start: Date; end: Date; label: string };

function resolveReportPeriod(filters: ReportFilters, now = new Date()): PeriodBounds {
  if (filters.range === "custom" && filters.dateFrom && filters.dateTo) {
    const start = startOfDay(new Date(filters.dateFrom));
    const end = endOfDay(new Date(filters.dateTo));
    return {
      start,
      end,
      label: `${filters.dateFrom} – ${filters.dateTo}`,
    };
  }

  const end = now;
  const todayStart = startOfDay(now);

  switch (filters.range) {
    case "today":
      return { start: todayStart, end, label: REPORT_RANGE_LABELS.today };
    case "7d":
      return {
        start: startOfDay(addDays(now, -6)),
        end,
        label: REPORT_RANGE_LABELS["7d"],
      };
    case "mtd":
      return { start: startOfMonth(now), end, label: REPORT_RANGE_LABELS.mtd };
    case "30d":
    default:
      return {
        start: startOfDay(addDays(now, -29)),
        end,
        label: REPORT_RANGE_LABELS["30d"],
      };
  }
}

function completedRoWhere(shopId: string, start: Date, end: Date) {
  return {
    shopId,
    status: { in: POSTED_STATUSES },
    OR: [
      { completedAt: { gte: start, lte: end } },
      { completedAt: null, updatedAt: { gte: start, lte: end } },
    ],
  };
}

function customerTypeWhere(customerType?: string) {
  if (customerType === "business") return { company: { not: null } };
  if (customerType === "person") return { OR: [{ company: null }, { company: "" }] };
  return {};
}

/** Technicians for report filter dropdowns. */
export async function getReportTechnicians(shopId: string): Promise<ReportTechnicianOption[]> {
  const memberships = await prisma.membership.findMany({
    where: { shopId, active: true, canPerformWork: true },
    select: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { user: { lastName: "asc" } },
  });

  return memberships.map((m) => ({
    id: m.user.id,
    name:
      `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() || "Unnamed",
  }));
}

export async function getSalesSummary(
  shopId: string,
  filters: ReportFilters = { range: "30d" },
): Promise<SalesSummaryRow[]> {
  const { start, end } = resolveReportPeriod(filters);

  const ros = await prisma.repairOrder.findMany({
    where: completedRoWhere(shopId, start, end),
    select: {
      completedAt: true,
      updatedAt: true,
      laborSubtotalCents: true,
      partsSubtotalCents: true,
      totalCents: true,
    },
  });

  const buckets = new Map<string, SalesSummaryRow>();
  const cursor = startOfDay(start);
  const endDay = startOfDay(end);
  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      roCount: 0,
      laborCents: 0,
      partsCents: 0,
      totalCents: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const ro of ros) {
    const anchor = ro.completedAt ?? ro.updatedAt;
    const key = anchor.toISOString().slice(0, 10);
    const row = buckets.get(key);
    if (!row) continue;
    row.roCount += 1;
    row.laborCents += ro.laborSubtotalCents;
    row.partsCents += ro.partsSubtotalCents;
    row.totalCents += ro.totalCents;
  }

  return Array.from(buckets.values());
}

export async function getArAging(shopId: string): Promise<ArAgingRow[]> {
  const now = new Date();
  const invoices = await prisma.invoice.findMany({
    where: { shopId, balanceCents: { gt: 0 } },
    orderBy: { issuedAt: "asc" },
    select: {
      number: true,
      balanceCents: true,
      issuedAt: true,
      dueAt: true,
      repairOrder: {
        select: {
          number: true,
          customer: {
            select: { firstName: true, lastName: true, company: true },
          },
        },
      },
    },
  });

  return invoices.map((inv) => {
    const anchor = inv.dueAt ?? inv.issuedAt ?? now;
    const days = Math.max(0, Math.floor((now.getTime() - anchor.getTime()) / 86400000));
    const bucket =
      days <= 30 ? "0–30 days" : days <= 60 ? "31–60 days" : days <= 90 ? "61–90 days" : "90+ days";
    return {
      invoiceNumber: inv.number,
      roNumber: inv.repairOrder.number,
      customerName: customerDisplayName(inv.repairOrder.customer),
      balanceCents: inv.balanceCents,
      daysOutstanding: days,
      bucket,
    };
  });
}

export async function getTechHours(
  shopId: string,
  filters: ReportFilters = { range: "30d" },
): Promise<TechHoursRow[]> {
  const { start, end } = resolveReportPeriod(filters);

  const jobs = await prisma.job.findMany({
    where: {
      shopId,
      authorized: true,
      ...(filters.techId ? { technicianId: filters.techId } : {}),
      repairOrder: {
        status: { in: [ROStatus.IN_PROGRESS, ROStatus.COMPLETED, ROStatus.INVOICED] },
        OR: [
          { completedAt: { gte: start, lte: end } },
          { completedAt: null, updatedAt: { gte: start, lte: end } },
        ],
      },
    },
    select: {
      technicianId: true,
      laborLines: { select: { hours: true, rateCents: true, authorized: true } },
    },
  });

  const techIds = [...new Set(jobs.map((j) => j.technicianId).filter(Boolean))] as string[];
  const users = techIds.length
    ? await prisma.user.findMany({
        where: { id: { in: techIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const nameOf = (id: string | null) => {
    if (!id) return "Unassigned";
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unnamed" : "Unknown";
  };

  const map = new Map<string, TechHoursRow>();

  for (const job of jobs) {
    const key = job.technicianId ?? "__unassigned";
    const name = nameOf(job.technicianId);
    const lines = job.laborLines.filter((l) => l.authorized);
    const hours = lines.reduce((s, l) => s + l.hours, 0);
    const laborCents = lines.reduce((s, l) => s + Math.round(l.hours * l.rateCents), 0);
    const existing = map.get(key) ?? { technicianName: name, jobCount: 0, hours: 0, laborCents: 0 };
    existing.jobCount += 1;
    existing.hours += hours;
    existing.laborCents += laborCents;
    map.set(key, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
}

async function buildSalesSummaryReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const rows = await getSalesSummary(shopId, filters);
  const active = rows.filter((r) => r.roCount > 0);
  const totalRos = active.reduce((s, r) => s + r.roCount, 0);
  const totalCents = active.reduce((s, r) => s + r.totalCents, 0);
  const laborCents = active.reduce((s, r) => s + r.laborCents, 0);
  const partsCents = active.reduce((s, r) => s + r.partsCents, 0);

  return {
    slug: "sales-summary",
    title: "Sales Summary",
    description: "Daily posted RO totals for the selected period.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Total sales", value: formatCentsDisplay(totalCents) },
      { label: "Repair orders", value: String(totalRos) },
      { label: "Labor", value: formatCentsDisplay(laborCents) },
      { label: "Parts", value: formatCentsDisplay(partsCents) },
    ],
    columns: [
      { key: "date", label: "Date", sortable: true },
      { key: "roCount", label: "ROs", align: "right", sortable: true, format: "number" },
      { key: "laborCents", label: "Labor", align: "right", sortable: true, format: "cents" },
      { key: "partsCents", label: "Parts", align: "right", sortable: true, format: "cents" },
      { key: "totalCents", label: "Total", align: "right", sortable: true, format: "cents" },
    ],
    rows: active.map((r) => ({ ...r })),
    chart: active.map((r) => ({
      label: r.date.slice(5),
      value: r.totalCents / 100,
      cents: r.totalCents,
    })),
    emptyMessage: "No posted sales in this period.",
  };
}

async function buildGrossProfitReport(
  shopId: string,
  _filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const ros = await prisma.repairOrder.findMany({
    where: completedRoWhere(shopId, period.start, period.end),
    select: {
      jobs: {
        where: { authorized: true },
        select: {
          laborLines: {
            where: { authorized: true },
            select: { totalCents: true },
          },
          partLines: {
            where: { authorized: true },
            select: { costCents: true, totalCents: true, quantity: true },
          },
        },
      },
    },
  });

  let partsCost = 0;
  let partsRetail = 0;
  let laborRetail = 0;

  for (const ro of ros) {
    for (const job of ro.jobs) {
      for (const l of job.laborLines) laborRetail += l.totalCents;
      for (const p of job.partLines) {
        partsCost += p.costCents * p.quantity;
        partsRetail += p.totalCents;
      }
    }
  }

  const revenue = partsRetail + laborRetail;
  const grossProfit = partsRetail - partsCost + laborRetail;
  const gpPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0;

  return {
    slug: "gross-profit",
    title: "Gross Profit Summary",
    description: "Parts margin and labor revenue on completed repair orders.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Gross profit", value: formatCentsDisplay(grossProfit) },
      { label: "GP %", value: `${gpPct}%` },
      { label: "Parts retail", value: formatCentsDisplay(partsRetail) },
      { label: "Parts cost", value: formatCentsDisplay(partsCost) },
      { label: "Labor revenue", value: formatCentsDisplay(laborRetail) },
    ],
    columns: [
      { key: "metric", label: "Metric" },
      { key: "amountCents", label: "Amount", align: "right", format: "cents" },
    ],
    rows: [
      { metric: "Parts retail", amountCents: partsRetail },
      { metric: "Parts cost", amountCents: partsCost },
      { metric: "Parts gross profit", amountCents: partsRetail - partsCost },
      { metric: "Labor revenue", amountCents: laborRetail },
      { metric: "Total gross profit", amountCents: grossProfit },
    ],
    emptyMessage: ros.length === 0 ? "No completed work in this period." : undefined,
  };
}

async function buildArAgingReport(shopId: string, period: PeriodBounds): Promise<ReportPayload> {
  const rows = await getArAging(shopId);
  const total = rows.reduce((s, r) => s + r.balanceCents, 0);
  const buckets = ["0–30 days", "31–60 days", "61–90 days", "90+ days"];
  const bucketTotals = buckets.map((b) => ({
    bucket: b,
    balanceCents: rows.filter((r) => r.bucket === b).reduce((s, r) => s + r.balanceCents, 0),
  }));

  return {
    slug: "ar-aging",
    title: "AR Aging",
    description: "Open invoice balances by age bucket.",
    periodLabel: "Current",
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Outstanding AR", value: formatCentsDisplay(total) },
      { label: "Open invoices", value: String(rows.length) },
      {
        label: "90+ days",
        value: formatCentsDisplay(bucketTotals.find((b) => b.bucket === "90+ days")?.balanceCents ?? 0),
      },
    ],
    columns: [
      { key: "invoiceNumber", label: "Invoice #", sortable: true },
      { key: "roNumber", label: "RO #", sortable: true },
      { key: "customerName", label: "Customer", sortable: true },
      { key: "balanceCents", label: "Balance", align: "right", sortable: true, format: "cents" },
      { key: "daysOutstanding", label: "Days", align: "right", sortable: true, format: "number" },
      { key: "bucket", label: "Bucket", sortable: true },
    ],
    rows: rows.map((r) => ({ ...r })),
    emptyMessage: "No outstanding balances — great job!",
  };
}

async function buildArByCustomerReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const invoices = await prisma.invoice.findMany({
    where: {
      shopId,
      balanceCents: { gt: 0 },
      repairOrder: {
        customer: customerTypeWhere(filters.customerType),
      },
    },
    select: {
      balanceCents: true,
      repairOrder: {
        select: {
          customer: {
            select: { id: true, firstName: true, lastName: true, company: true, phone: true },
          },
        },
      },
    },
  });

  const map = new Map<string, { customerName: string; phone: string; invoiceCount: number; balanceCents: number }>();
  for (const inv of invoices) {
    const c = inv.repairOrder.customer;
    const key = c.id;
    const existing = map.get(key) ?? {
      customerName: customerDisplayName(c),
      phone: c.phone ?? "—",
      invoiceCount: 0,
      balanceCents: 0,
    };
    existing.invoiceCount += 1;
    existing.balanceCents += inv.balanceCents;
    map.set(key, existing);
  }

  const rows = Array.from(map.values()).sort((a, b) => b.balanceCents - a.balanceCents);
  const total = rows.reduce((s, r) => s + r.balanceCents, 0);

  return {
    slug: "ar-by-customer",
    title: "AR by Customer",
    description: "Outstanding balances grouped by customer.",
    periodLabel: "Current",
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Total AR", value: formatCentsDisplay(total) },
      { label: "Customers", value: String(rows.length) },
    ],
    columns: [
      { key: "customerName", label: "Customer", sortable: true },
      { key: "phone", label: "Phone" },
      { key: "invoiceCount", label: "Invoices", align: "right", sortable: true, format: "number" },
      { key: "balanceCents", label: "Balance", align: "right", sortable: true, format: "cents" },
    ],
    rows,
    emptyMessage: "No customer balances outstanding.",
  };
}

async function buildRoThroughputReport(
  shopId: string,
  _filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const [created, completed] = await Promise.all([
    prisma.repairOrder.findMany({
      where: { shopId, createdAt: { gte: period.start, lte: period.end } },
      select: { createdAt: true },
    }),
    prisma.repairOrder.findMany({
      where: completedRoWhere(shopId, period.start, period.end),
      select: { completedAt: true, updatedAt: true },
    }),
  ]);

  const buckets = new Map<string, { date: string; created: number; completed: number }>();
  const cursor = startOfDay(period.start);
  const endDay = startOfDay(period.end);
  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, { date: key, created: 0, completed: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const ro of created) {
    const key = ro.createdAt.toISOString().slice(0, 10);
    const row = buckets.get(key);
    if (row) row.created += 1;
  }
  for (const ro of completed) {
    const anchor = ro.completedAt ?? ro.updatedAt;
    const key = anchor.toISOString().slice(0, 10);
    const row = buckets.get(key);
    if (row) row.completed += 1;
  }

  const rows = Array.from(buckets.values()).filter((r) => r.created > 0 || r.completed > 0);
  const totalCreated = rows.reduce((s, r) => s + r.created, 0);
  const totalCompleted = rows.reduce((s, r) => s + r.completed, 0);

  return {
    slug: "ro-throughput",
    title: "RO Throughput",
    description: "Repair orders created vs completed by day.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Created", value: String(totalCreated) },
      { label: "Completed", value: String(totalCompleted) },
      {
        label: "Completion rate",
        value: totalCreated > 0 ? `${Math.round((totalCompleted / totalCreated) * 100)}%` : "—",
      },
    ],
    columns: [
      { key: "date", label: "Date", sortable: true },
      { key: "created", label: "Created", align: "right", sortable: true, format: "number" },
      { key: "completed", label: "Completed", align: "right", sortable: true, format: "number" },
    ],
    rows,
    chart: rows.map((r) => ({
      label: r.date.slice(5),
      value: r.completed,
    })),
    emptyMessage: "No repair order activity in this period.",
  };
}

async function buildRoByStatusReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const where = {
    shopId,
    ...(filters.status ? { status: filters.status as ROStatus } : {}),
  };

  const groups = await prisma.repairOrder.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
    _sum: { totalCents: true },
  });

  const rows = groups
    .map((g) => ({
      status: g.status,
      statusLabel: RO_STATUS_LABELS[g.status],
      count: g._count._all,
      totalCents: g._sum.totalCents ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const totalRos = rows.reduce((s, r) => s + r.count, 0);

  return {
    slug: "ro-by-status",
    title: "ROs by Status",
    description: "Current repair order counts by workflow status.",
    periodLabel: filters.status ? RO_STATUS_LABELS[filters.status as ROStatus] : "All statuses",
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Total ROs", value: String(totalRos) },
      { label: "Statuses", value: String(rows.length) },
    ],
    columns: [
      { key: "statusLabel", label: "Status", sortable: true },
      { key: "count", label: "Count", align: "right", sortable: true, format: "number" },
      { key: "totalCents", label: "Total value", align: "right", sortable: true, format: "cents" },
    ],
    rows,
    emptyMessage: "No repair orders match this filter.",
  };
}

async function buildAroReport(
  shopId: string,
  _filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const agg = await prisma.repairOrder.aggregate({
    where: completedRoWhere(shopId, period.start, period.end),
    _avg: { totalCents: true, laborSubtotalCents: true, partsSubtotalCents: true },
    _count: { _all: true },
  });

  const count = agg._count._all;
  const avgTotal = Math.round(agg._avg.totalCents ?? 0);
  const avgLabor = Math.round(agg._avg.laborSubtotalCents ?? 0);
  const avgParts = Math.round(agg._avg.partsSubtotalCents ?? 0);

  const ros = await prisma.repairOrder.findMany({
    where: completedRoWhere(shopId, period.start, period.end),
    orderBy: { completedAt: "desc" },
    take: 50,
    select: {
      number: true,
      totalCents: true,
      laborSubtotalCents: true,
      partsSubtotalCents: true,
      completedAt: true,
      customer: { select: { firstName: true, lastName: true, company: true } },
    },
  });

  return {
    slug: "aro-report",
    title: "Average Repair Order",
    description: "Average ticket size on completed repair orders.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Average RO", value: formatCentsDisplay(avgTotal) },
      { label: "Completed ROs", value: String(count) },
      { label: "Avg labor", value: formatCentsDisplay(avgLabor) },
      { label: "Avg parts", value: formatCentsDisplay(avgParts) },
    ],
    columns: [
      { key: "number", label: "RO #", sortable: true },
      { key: "customerName", label: "Customer", sortable: true },
      { key: "totalCents", label: "Total", align: "right", sortable: true, format: "cents" },
      { key: "laborSubtotalCents", label: "Labor", align: "right", format: "cents" },
      { key: "partsSubtotalCents", label: "Parts", align: "right", format: "cents" },
      { key: "completedAt", label: "Completed", sortable: true },
    ],
    rows: ros.map((ro) => ({
      number: ro.number,
      customerName: customerDisplayName(ro.customer),
      totalCents: ro.totalCents,
      laborSubtotalCents: ro.laborSubtotalCents,
      partsSubtotalCents: ro.partsSubtotalCents,
      completedAt: ro.completedAt?.toISOString().slice(0, 10) ?? "—",
    })),
    emptyMessage: "No completed repair orders in this period.",
  };
}

async function buildCarCountReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const sales = await getSalesSummary(shopId, filters);
  const active = sales.filter((r) => r.roCount > 0);
  const totalCars = active.reduce((s, r) => s + r.roCount, 0);
  const avgPerDay =
    active.length > 0 ? (totalCars / active.length).toFixed(1) : "0";

  return {
    slug: "car-count",
    title: "Car Count",
    description: "Completed repair orders — cars serviced per day.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Cars serviced", value: String(totalCars) },
      { label: "Avg / day", value: avgPerDay },
      { label: "Active days", value: String(active.length) },
    ],
    columns: [
      { key: "date", label: "Date", sortable: true },
      { key: "roCount", label: "Cars", align: "right", sortable: true, format: "number" },
      { key: "totalCents", label: "Sales", align: "right", sortable: true, format: "cents" },
    ],
    rows: active.map((r) => ({ date: r.date, roCount: r.roCount, totalCents: r.totalCents })),
    chart: active.map((r) => ({ label: r.date.slice(5), value: r.roCount })),
    emptyMessage: "No cars serviced in this period.",
  };
}

async function buildPaymentsByMethodReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const groups = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      shopId,
      paidAt: { gte: period.start, lte: period.end },
      ...(filters.paymentMethod
        ? { method: filters.paymentMethod as PaymentMethod }
        : {}),
    },
    _sum: { amountCents: true },
    _count: { _all: true },
  });

  const rows = groups
    .map((g) => ({
      method: g.method,
      methodLabel: PAYMENT_METHOD_LABELS[g.method] ?? g.method,
      count: g._count._all,
      amountCents: g._sum.amountCents ?? 0,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const total = rows.reduce((s, r) => s + r.amountCents, 0);

  return {
    slug: "payments-by-method",
    title: "Payments by Method",
    description: "Collected payments grouped by payment method.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Total collected", value: formatCentsDisplay(total) },
      { label: "Transactions", value: String(rows.reduce((s, r) => s + r.count, 0)) },
      { label: "Methods", value: String(rows.length) },
    ],
    columns: [
      { key: "methodLabel", label: "Method", sortable: true },
      { key: "count", label: "Count", align: "right", sortable: true, format: "number" },
      { key: "amountCents", label: "Amount", align: "right", sortable: true, format: "cents" },
    ],
    rows,
    chart: rows.map((r) => ({
      label: r.methodLabel,
      value: r.amountCents / 100,
      cents: r.amountCents,
    })),
    emptyMessage: "No payments collected in this period.",
  };
}

async function buildTechHoursReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const rows = await getTechHours(shopId, filters);
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const totalLabor = rows.reduce((s, r) => s + r.laborCents, 0);

  return {
    slug: "tech-hours",
    title: "Technician Hours",
    description: "Authorized labor hours by assigned technician.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Total hours", value: totalHours.toFixed(1) },
      { label: "Labor billed", value: formatCentsDisplay(totalLabor) },
      { label: "Technicians", value: String(rows.length) },
    ],
    columns: [
      { key: "technicianName", label: "Technician", sortable: true },
      { key: "jobCount", label: "Jobs", align: "right", sortable: true, format: "number" },
      { key: "hours", label: "Hours", align: "right", sortable: true, format: "number" },
      { key: "laborCents", label: "Labor $", align: "right", sortable: true, format: "cents" },
    ],
    rows: rows.map((r) => ({
      technicianName: r.technicianName,
      jobCount: r.jobCount,
      hours: Math.round(r.hours * 10) / 10,
      laborCents: r.laborCents,
    })),
    emptyMessage: "No technician hours in this period.",
  };
}

async function buildTechProductivityReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const jobs = await prisma.job.findMany({
    where: {
      shopId,
      authorized: true,
      ...(filters.techId ? { technicianId: filters.techId } : {}),
      repairOrder: {
        status: { in: POSTED_STATUSES },
        OR: [
          { completedAt: { gte: period.start, lte: period.end } },
          { completedAt: null, updatedAt: { gte: period.start, lte: period.end } },
        ],
      },
    },
    select: {
      technicianId: true,
      laborLines: { where: { authorized: true }, select: { hours: true } },
    },
  });

  const techIds = [...new Set(jobs.map((j) => j.technicianId).filter(Boolean))] as string[];
  const users = techIds.length
    ? await prisma.user.findMany({
        where: { id: { in: techIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  const nameOf = (id: string | null) => {
    if (!id) return "Unassigned";
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Unnamed" : "Unknown";
  };

  const map = new Map<string, { technicianName: string; jobs: number; hours: number }>();
  for (const job of jobs) {
    const key = job.technicianId ?? "__unassigned";
    const existing = map.get(key) ?? {
      technicianName: nameOf(job.technicianId),
      jobs: 0,
      hours: 0,
    };
    existing.jobs += 1;
    existing.hours += job.laborLines.reduce((s, l) => s + l.hours, 0);
    map.set(key, existing);
  }

  const rows = Array.from(map.values())
    .map((r) => ({
      ...r,
      hours: Math.round(r.hours * 10) / 10,
      hoursPerJob: r.jobs > 0 ? Math.round((r.hours / r.jobs) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  return {
    slug: "tech-productivity",
    title: "Tech Productivity",
    description: "Jobs and billed hours per technician on posted work.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Total jobs", value: String(rows.reduce((s, r) => s + r.jobs, 0)) },
      { label: "Total hours", value: rows.reduce((s, r) => s + r.hours, 0).toFixed(1) },
      { label: "Technicians", value: String(rows.length) },
    ],
    columns: [
      { key: "technicianName", label: "Technician", sortable: true },
      { key: "jobs", label: "Jobs", align: "right", sortable: true, format: "number" },
      { key: "hours", label: "Hours", align: "right", sortable: true, format: "number" },
      { key: "hoursPerJob", label: "Hrs / job", align: "right", sortable: true, format: "number" },
    ],
    rows,
    emptyMessage: "No technician productivity data in this period.",
  };
}

async function buildCustomerListReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const customers = await prisma.customer.findMany({
    where: { shopId, ...customerTypeWhere(filters.customerType) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      tags: true,
      leadSource: true,
      createdAt: true,
      _count: { select: { repairOrders: true, vehicles: true } },
    },
  });

  const rows = customers.map((c) => ({
    customerName: customerDisplayName(c),
    type: c.company?.trim() ? "Business" : "Person",
    phone: c.phone ?? "—",
    email: c.email ?? "—",
    tags: c.tags.join(", ") || "—",
    leadSource: c.leadSource ?? "—",
    vehicles: c._count.vehicles,
    repairOrders: c._count.repairOrders,
    createdAt: c.createdAt.toISOString().slice(0, 10),
  }));

  return {
    slug: "customer-list",
    title: "Customer Export",
    description: "Full customer directory with contact info.",
    periodLabel: "All time",
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Customers", value: String(rows.length) },
      {
        label: "Businesses",
        value: String(rows.filter((r) => r.type === "Business").length),
      },
    ],
    columns: [
      { key: "customerName", label: "Customer", sortable: true },
      { key: "type", label: "Type", sortable: true },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "repairOrders", label: "ROs", align: "right", format: "number" },
      { key: "createdAt", label: "Created", sortable: true },
    ],
    rows,
    emptyMessage: "No customers found.",
  };
}

async function buildNewCustomersReport(
  shopId: string,
  filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const customers = await prisma.customer.findMany({
    where: {
      shopId,
      createdAt: { gte: period.start, lte: period.end },
      ...customerTypeWhere(filters.customerType),
    },
    orderBy: { createdAt: "desc" },
    select: {
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      email: true,
      leadSource: true,
      createdAt: true,
    },
  });

  const rows = customers.map((c) => ({
    customerName: customerDisplayName(c),
    type: c.company?.trim() ? "Business" : "Person",
    phone: c.phone ?? "—",
    email: c.email ?? "—",
    leadSource: c.leadSource ?? "—",
    createdAt: c.createdAt.toISOString().slice(0, 10),
  }));

  return {
    slug: "new-customers",
    title: "New Customers",
    description: "Customers created during the selected period.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "New customers", value: String(rows.length) },
      {
        label: "Businesses",
        value: String(rows.filter((r) => r.type === "Business").length),
      },
    ],
    columns: [
      { key: "customerName", label: "Customer", sortable: true },
      { key: "type", label: "Type" },
      { key: "phone", label: "Phone" },
      { key: "leadSource", label: "Lead source" },
      { key: "createdAt", label: "Created", sortable: true },
    ],
    rows,
    emptyMessage: "No new customers in this period.",
  };
}

async function buildMarketingLeadsReport(
  shopId: string,
  _filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const ros = await prisma.repairOrder.findMany({
    where: {
      shopId,
      createdAt: { gte: period.start, lte: period.end },
      marketingSource: { not: null },
    },
    select: { marketingSource: true, totalCents: true },
  });

  const map = new Map<string, { source: string; count: number; totalCents: number }>();
  for (const ro of ros) {
    const source = ro.marketingSource?.trim() || "Unknown";
    const existing = map.get(source) ?? { source, count: 0, totalCents: 0 };
    existing.count += 1;
    existing.totalCents += ro.totalCents;
    map.set(source, existing);
  }

  const rows = Array.from(map.values()).sort((a, b) => b.count - a.count);
  const totalRos = rows.reduce((s, r) => s + r.count, 0);

  return {
    slug: "marketing-leads",
    title: "Leads by Source",
    description: "Repair orders grouped by marketing / lead source.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "ROs with source", value: String(totalRos) },
      { label: "Lead sources", value: String(rows.length) },
    ],
    columns: [
      { key: "source", label: "Source", sortable: true },
      { key: "count", label: "ROs", align: "right", sortable: true, format: "number" },
      { key: "totalCents", label: "Total value", align: "right", sortable: true, format: "cents" },
    ],
    rows,
    chart: rows.slice(0, 12).map((r) => ({ label: r.source.slice(0, 12), value: r.count })),
    emptyMessage: "No marketing source data in this period.",
  };
}

async function buildTireOrdersReport(
  shopId: string,
  _filters: ReportFilters,
  period: PeriodBounds,
): Promise<ReportPayload> {
  const orders = await prisma.tireOrder.findMany({
    where: {
      shopId,
      createdAt: { gte: period.start, lte: period.end },
    },
    orderBy: { createdAt: "desc" },
    select: {
      number: true,
      status: true,
      tireBrand: true,
      tireQuantity: true,
      estimatedTotalCents: true,
      source: true,
      createdAt: true,
      customer: { select: { firstName: true, lastName: true, company: true } },
    },
  });

  const statusLabel = (s: TireOrderStatus) =>
    s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const rows = orders.map((o) => ({
    number: o.number,
    customerName: customerDisplayName(o.customer),
    status: statusLabel(o.status),
    tireBrand: o.tireBrand ?? "—",
    quantity: o.tireQuantity,
    estimatedTotalCents: o.estimatedTotalCents ?? 0,
    source: o.source,
    createdAt: o.createdAt.toISOString().slice(0, 10),
  }));

  const pending = orders.filter(
    (o) =>
      o.status === TireOrderStatus.LEAD ||
      o.status === TireOrderStatus.PENDING_SUPPLIER_APPROVAL,
  ).length;

  return {
    slug: "tire-orders",
    title: "Tire Orders",
    description: "Tire quotes and orders in the selected period.",
    periodLabel: period.label,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    kpis: [
      { label: "Tire orders", value: String(rows.length) },
      { label: "Open / pending", value: String(pending) },
    ],
    columns: [
      { key: "number", label: "#", sortable: true },
      { key: "customerName", label: "Customer", sortable: true },
      { key: "status", label: "Status" },
      { key: "tireBrand", label: "Brand" },
      { key: "quantity", label: "Qty", align: "right", format: "number" },
      { key: "estimatedTotalCents", label: "Est. total", align: "right", format: "cents" },
      { key: "createdAt", label: "Created", sortable: true },
    ],
    rows,
    emptyMessage: "No tire orders in this period.",
  };
}

function formatCentsDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Run a pre-built report by slug with shared filters. */
export async function runReport(
  slug: string,
  shopId: string,
  filters: ReportFilters,
): Promise<ReportPayload | null> {
  const def = getReportDefinition(slug);
  if (!def) return null;

  const period = resolveReportPeriod(filters);

  switch (slug) {
    case "sales-summary":
      return buildSalesSummaryReport(shopId, filters, period);
    case "gross-profit":
      return buildGrossProfitReport(shopId, filters, period);
    case "ar-aging":
      return buildArAgingReport(shopId, period);
    case "ar-by-customer":
      return buildArByCustomerReport(shopId, filters, period);
    case "ro-throughput":
      return buildRoThroughputReport(shopId, filters, period);
    case "ro-by-status":
      return buildRoByStatusReport(shopId, filters, period);
    case "aro-report":
      return buildAroReport(shopId, filters, period);
    case "car-count":
      return buildCarCountReport(shopId, filters, period);
    case "payments-by-method":
      return buildPaymentsByMethodReport(shopId, filters, period);
    case "tech-hours":
      return buildTechHoursReport(shopId, filters, period);
    case "tech-productivity":
      return buildTechProductivityReport(shopId, filters, period);
    case "customer-list":
      return buildCustomerListReport(shopId, filters, period);
    case "new-customers":
      return buildNewCustomersReport(shopId, filters, period);
    case "marketing-leads":
      return buildMarketingLeadsReport(shopId, filters, period);
    case "tire-orders":
      return buildTireOrdersReport(shopId, filters, period);
    default:
      return null;
  }
}
