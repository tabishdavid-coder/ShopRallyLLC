import "server-only";

import { prisma } from "@/db/client";
import { ROStatus } from "@/generated/prisma";
import type { DashboardHomeWidgets, TopServiceRow } from "@/lib/dashboard-home";

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Extra dashboard cards: overdue follow-ups, open-estimate status donut,
 * and top-performing services this month.
 */
export async function getDashboardHomeWidgets(shopId: string): Promise<DashboardHomeWidgets> {
  const monthStart = startOfMonth();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [pendingEstimates, approvedOpen, overdueCustomers, monthJobs] = await Promise.all([
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        status: ROStatus.ESTIMATE,
        authorizedAt: null,
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        archivedAt: null,
        status: { in: [ROStatus.ESTIMATE, ROStatus.APPROVED] },
        authorizedAt: { not: null },
      },
    }),
    // Customers with an open estimate older than 14 days.
    prisma.customer.count({
      where: {
        shopId,
        repairOrders: {
          some: {
            archivedAt: null,
            status: ROStatus.ESTIMATE,
            createdAt: { lte: fourteenDaysAgo },
          },
        },
      },
    }),
    prisma.job.findMany({
      where: {
        shopId,
        createdAt: { gte: monthStart },
        repairOrder: {
          shopId,
          archivedAt: null,
          status: {
            in: [ROStatus.COMPLETED, ROStatus.INVOICED, ROStatus.IN_PROGRESS, ROStatus.APPROVED],
          },
        },
      },
      select: {
        name: true,
        laborLines: { select: { totalCents: true } },
        partLines: { select: { totalCents: true } },
      },
      take: 500,
    }),
  ]);

  const byName = new Map<string, number>();
  for (const job of monthJobs) {
    const labor = job.laborLines.reduce((s, l) => s + l.totalCents, 0);
    const parts = job.partLines.reduce((s, l) => s + l.totalCents, 0);
    const total = labor + parts;
    if (total <= 0) continue;
    const key = job.name.trim() || "Service";
    byName.set(key, (byName.get(key) ?? 0) + total);
  }

  const topServices: TopServiceRow[] = Array.from(byName.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amountCents], i) => ({
      name,
      amountCents,
      rank: i + 1,
    }));

  return {
    overdueFollowUps: overdueCustomers,
    estimateStatus: [
      { key: "pending", label: "Pending", count: pendingEstimates, color: "#3B82F6" },
      { key: "approved", label: "Approved", count: approvedOpen, color: "#22C55E" },
      // No RO-level declined status in schema yet — show 0 until modeled.
      { key: "declined", label: "Declined", count: 0, color: "#EF4444" },
    ],
    topServices,
  };
}
