import "server-only";

import { prisma } from "@/db/client";
import { type Prisma } from "@/generated/prisma";
import { COLUMN_OF, type JobBoard, type JobCard } from "@/lib/job-board";
import {
  resolveJobBoardPipelineConfig,
  resolveRoPipelineColumnId,
  type JobBoardPipelineConfig,
} from "@/lib/job-board-pipeline";
import { runCompletedRoAutoArchive } from "@/server/ro-auto-archive";

export {
  COLUMN_OF,
  COLUMN_STATUS,
  type JobBoard,
  type JobCard,
  type BoardColumn,
} from "@/lib/job-board";

export { resolveJobBoardPipelineConfig, type JobBoardPipelineConfig } from "@/lib/job-board-pipeline";

export async function getJobBoardPipelineConfig(shopId: string): Promise<JobBoardPipelineConfig> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { jobBoardPipeline: true },
  });
  return resolveJobBoardPipelineConfig(shop?.jobBoardPipeline);
}

/** All repair orders for a shop, grouped into pipeline columns. */
export async function getJobBoard(opts: {
  shopId: string;
  q?: string;
  employeeId?: string;
  appointmentOption?: string;
  visibility?: "active" | "archived" | "all";
  payment?: "paid" | "balance" | "unpaid";
  approval?: "needs" | "sent" | "approved";
  marketingSource?: string;
}): Promise<JobBoard> {
  if (opts.visibility !== "archived") {
    await runCompletedRoAutoArchive(opts.shopId);
  }

  const pipeline = await getJobBoardPipelineConfig(opts.shopId);

  const q = opts.q?.trim();
  const where: Prisma.RepairOrderWhereInput = {
    shopId: opts.shopId,
  };
  const and: Prisma.RepairOrderWhereInput[] = [];

  if (opts.visibility === "archived") {
    where.archivedAt = { not: null };
  } else if (opts.visibility === "all") {
    // no archivedAt constraint
  } else {
    where.archivedAt = null;
  }

  if (opts.marketingSource) {
    where.marketingSource = opts.marketingSource;
  }

  if (opts.payment === "paid") {
    and.push({
      invoice: { balanceCents: 0, payments: { some: {} } },
    });
  } else if (opts.payment === "balance") {
    and.push({ invoice: { balanceCents: { gt: 0 } } });
  } else if (opts.payment === "unpaid") {
    and.push({
      OR: [
        { invoice: null },
        { invoice: { payments: { none: {} } } },
        { invoice: { balanceCents: { gt: 0 } } },
      ],
    });
  }

  if (opts.approval === "needs") {
    and.push({ status: "ESTIMATE", authorizedAt: null });
  } else if (opts.approval === "approved") {
    and.push({ authorizedAt: { not: null } });
  } else if (opts.approval === "sent") {
    and.push({ approvalSentAt: { not: null }, authorizedAt: null });
  }

  if (opts.employeeId) {
    and.push({
      OR: [
        { serviceWriterId: opts.employeeId },
        { technicianId: opts.employeeId },
        { jobs: { some: { technicianId: opts.employeeId } } },
      ],
    });
  }
  if (opts.appointmentOption) {
    where.appointmentOption = opts.appointmentOption;
  }
  if (q) {
    const asNumber = Number(q.replace(/\D/g, ""));
    and.push({
      OR: [
        { customer: { firstName: { contains: q, mode: "insensitive" } } },
        { customer: { lastName: { contains: q, mode: "insensitive" } } },
        { customer: { company: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q } } },
        { vehicle: { make: { contains: q, mode: "insensitive" } } },
        { vehicle: { model: { contains: q, mode: "insensitive" } } },
        { vehicle: { plate: { contains: q, mode: "insensitive" } } },
        ...(Number.isFinite(asNumber) && asNumber > 0 ? [{ number: asNumber }] : []),
      ],
    });
  }
  if (and.length) where.AND = and;

  const ros = await prisma.repairOrder.findMany({
    where,
    orderBy: [{ boardOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      number: true,
      status: true,
      jobBoardColumnId: true,
      totalCents: true,
      createdAt: true,
      completedAt: true,
      authorizedAt: true,
      approvedVia: true,
      approvalSentAt: true,
      estimateViewedAt: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          phone: true,
          marketingOptIn: true,
        },
      },
      vehicle: {
        select: {
          id: true,
          year: true,
          make: true,
          model: true,
          plate: true,
          plateState: true,
        },
      },
      invoice: {
        select: {
          balanceCents: true,
          payments: {
            orderBy: { paidAt: "desc" },
            take: 1,
            select: { method: true, paidAt: true },
          },
        },
      },
      _count: { select: { inspections: true } },
    },
  });

  const customerIds = [...new Set(ros.map((r) => r.customer.id))];
  const unreadByCustomer = new Map<string, number>();
  if (customerIds.length > 0) {
    const unreadGroups = await prisma.message.groupBy({
      by: ["customerId"],
      where: {
        shopId: opts.shopId,
        customerId: { in: customerIds },
        direction: "INBOUND",
        readAt: null,
      },
      _count: { _all: true },
    });
    for (const g of unreadGroups) {
      unreadByCustomer.set(g.customerId, g._count._all);
    }
  }

  const cardsByColumnId: Record<string, JobCard[]> = Object.fromEntries(
    pipeline.columns.map((c) => [c.id, [] as JobCard[]]),
  );
  const estimates: JobCard[] = [];
  const workInProgress: JobCard[] = [];
  const completed: JobCard[] = [];

  for (const ro of ros) {
    const balanceCents = ro.invoice?.balanceCents ?? null;
    const lastPayment = ro.invoice?.payments[0] ?? null;
    const paymentPosted =
      balanceCents === 0 &&
      lastPayment != null &&
      (ro.status === "COMPLETED" || ro.status === "INVOICED");
    const canArchive =
      paymentPosted && (ro.status === "COMPLETED" || ro.status === "INVOICED");

    const core = COLUMN_OF[ro.status];
    // Approximate stage entry: no dedicated board-column-entered timestamp.
    const stageEnteredAt =
      core === "workInProgress"
        ? (ro.authorizedAt ?? ro.createdAt)
        : core === "completed"
          ? (ro.completedAt ?? ro.createdAt)
          : ro.createdAt;

    const card: JobCard = {
      id: ro.id,
      number: ro.number,
      status: ro.status,
      customer: ro.customer,
      vehicle: ro.vehicle,
      totalCents: ro.totalCents,
      createdAt: ro.createdAt,
      stageEnteredAt,
      hasInspection: ro._count.inspections > 0,
      invoiceBalanceCents: balanceCents,
      authorizedAt: ro.authorizedAt,
      approvedVia: ro.approvedVia,
      approvalSentAt: ro.approvalSentAt,
      estimateViewedAt: ro.estimateViewedAt,
      lastPaymentMethod: lastPayment?.method ?? null,
      lastPaymentAt: lastPayment?.paidAt ?? null,
      paymentPosted,
      unreadSmsCount: unreadByCustomer.get(ro.customer.id) ?? 0,
      canArchive,
    };

    const columnId = resolveRoPipelineColumnId(ro, pipeline);
    if (!cardsByColumnId[columnId]) cardsByColumnId[columnId] = [];
    cardsByColumnId[columnId].push(card);

    if (core === "estimates") estimates.push(card);
    else if (core === "workInProgress") workInProgress.push(card);
    else completed.push(card);
  }

  return {
    columns: pipeline.columns,
    cardsByColumnId,
    estimates,
    workInProgress,
    completed,
  };
}

export async function saveShopJobBoardPipeline(
  shopId: string,
  raw: unknown,
): Promise<JobBoardPipelineConfig> {
  const config = resolveJobBoardPipelineConfig(raw);
  await prisma.shop.update({
    where: { id: shopId },
    data: { jobBoardPipeline: config },
  });
  return config;
}
