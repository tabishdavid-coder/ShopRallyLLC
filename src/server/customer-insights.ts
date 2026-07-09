import "server-only";

import { prisma } from "@/db/client";
import { customerDisplayName } from "@/lib/format";
import {
  isInsightsCacheFresh,
  parseCustomerInsightsCache,
  type CustomerInsightsCache,
} from "@/lib/customer-insights-ai";
import { canUseFeature } from "@/lib/subscription";
import { isAiConfigured } from "@/server/services/ai/client";
import { suggestCustomerInsights } from "@/server/services/ai/customer-insights";

export type CustomerInsightContext = {
  customerName: string;
  marketingOptIn: boolean;
  tags: string[];
  leadSource: string | null;
  repairOrderCount: number;
  lastVisitAt: string | null;
  avgTicketCents: number;
  lifetimeTotalCents: number;
  openBalanceCents: number;
  openRoCount: number;
  attentionItems: { name: string; roNumber: number; status: "RED" | "YELLOW" }[];
  campaignTouches: number;
  lastCampaignTouchAt: string | null;
  recentRepairOrders: {
    number: number;
    date: string;
    status: string;
    totalCents: number;
    vehicle: string;
  }[];
};

export type CustomerInsightsView =
  | { kind: "upgrade" }
  | { kind: "empty"; reason: "no_ros" | "ai_unconfigured" }
  | {
      kind: "ready";
      insights: CustomerInsightsCache;
      fromCache: boolean;
    }
  | { kind: "error"; message: string };

function vehicleLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
}): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "—";
}

export async function getCustomerInsightContext(
  shopId: string,
  customerId: string,
): Promise<CustomerInsightContext | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      firstName: true,
      lastName: true,
      company: true,
      marketingOptIn: true,
      tags: true,
      leadSource: true,
      repairOrders: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          number: true,
          status: true,
          totalCents: true,
          createdAt: true,
          vehicle: { select: { year: true, make: true, model: true } },
          invoice: { select: { balanceCents: true } },
        },
      },
    },
  });

  if (!customer) return null;

  const repairOrders = customer.repairOrders;
  const [repairOrderCount, openRoCount, totals, openBalanceAgg] = await Promise.all([
    prisma.repairOrder.count({ where: { shopId, customerId } }),
    prisma.repairOrder.count({
      where: {
        shopId,
        customerId,
        status: { notIn: ["COMPLETED", "INVOICED"] },
      },
    }),
    prisma.repairOrder.aggregate({
      where: { shopId, customerId },
      _sum: { totalCents: true },
    }),
    prisma.invoice.aggregate({
      where: { shopId, repairOrder: { customerId, shopId } },
      _sum: { balanceCents: true },
    }),
  ]);

  const lifetimeTotalCents = totals._sum.totalCents ?? 0;
  const openBalanceCents = openBalanceAgg._sum.balanceCents ?? 0;

  const rawItems = await prisma.inspectionItem.findMany({
    where: {
      shopId,
      status: { in: ["RED", "YELLOW"] },
      inspection: { repairOrder: { customerId, shopId } },
    },
    select: {
      name: true,
      status: true,
      inspection: {
        select: {
          repairOrder: { select: { number: true, createdAt: true } },
        },
      },
    },
    take: 20,
  });

  const attentionItems = rawItems
    .map((item) => ({
      name: item.name,
      roNumber: item.inspection.repairOrder.number,
      status: item.status as "RED" | "YELLOW",
      createdAt: item.inspection.repairOrder.createdAt.getTime(),
    }))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8)
    .map(({ name, roNumber, status }) => ({ name, roNumber, status }));

  const [campaignTouchCount, automationTouchCount, lastCampaign, lastAutomation] =
    await Promise.all([
      prisma.campaignSend.count({
        where: { customerId, status: "SENT" },
      }),
      prisma.automationSend.count({
        where: { customerId, status: "SENT", sentAt: { not: null } },
      }),
      prisma.campaignSend.findFirst({
        where: { customerId, status: "SENT", sentAt: { not: null } },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      }),
      prisma.automationSend.findFirst({
        where: { customerId, status: "SENT", sentAt: { not: null } },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      }),
    ]);

  const lastTouchCandidates = [lastCampaign?.sentAt, lastAutomation?.sentAt].filter(
    (d): d is Date => d instanceof Date,
  );
  const lastCampaignTouchAt =
    lastTouchCandidates.length > 0
      ? new Date(Math.max(...lastTouchCandidates.map((d) => d.getTime()))).toISOString()
      : null;

  return {
    customerName: customerDisplayName(customer),
    marketingOptIn: customer.marketingOptIn,
    tags: customer.tags,
    leadSource: customer.leadSource,
    repairOrderCount,
    lastVisitAt: repairOrders[0]?.createdAt.toISOString() ?? null,
    avgTicketCents:
      repairOrderCount > 0 ? Math.round(lifetimeTotalCents / repairOrderCount) : 0,
    lifetimeTotalCents,
    openBalanceCents,
    openRoCount,
    attentionItems,
    campaignTouches: campaignTouchCount + automationTouchCount,
    lastCampaignTouchAt,
    recentRepairOrders: repairOrders.map((ro) => ({
      number: ro.number,
      date: ro.createdAt.toISOString().slice(0, 10),
      status: ro.status,
      totalCents: ro.totalCents,
      vehicle: ro.vehicle ? vehicleLabel(ro.vehicle) : "—",
    })),
  };
}

async function saveInsightsCache(
  customerId: string,
  cache: CustomerInsightsCache,
): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: { aiInsightsCache: cache },
  });
}

async function generateAndCacheInsights(
  shopId: string,
  customerId: string,
  ctx: CustomerInsightContext,
): Promise<CustomerInsightsCache> {
  const insights = await suggestCustomerInsights(shopId, ctx);
  const cache: CustomerInsightsCache = {
    ...insights,
    generatedAt: new Date().toISOString(),
  };
  await saveInsightsCache(customerId, cache);
  return cache;
}

export async function loadCustomerInsights(
  shopId: string,
  customerId: string,
  options?: { forceRefresh?: boolean },
): Promise<CustomerInsightsView> {
  const allowed = await canUseFeature(shopId, "ai_customer_insights");
  if (!allowed) return { kind: "upgrade" };

  if (!isAiConfigured()) {
    return { kind: "empty", reason: "ai_unconfigured" };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: { aiInsightsCache: true },
  });
  if (!customer) return { kind: "error", message: "Customer not found." };

  const ctx = await getCustomerInsightContext(shopId, customerId);
  if (!ctx) return { kind: "error", message: "Customer not found." };
  if (ctx.repairOrderCount < 1) return { kind: "empty", reason: "no_ros" };

  if (!options?.forceRefresh) {
    const cached = parseCustomerInsightsCache(customer.aiInsightsCache);
    if (cached && isInsightsCacheFresh(cached.generatedAt)) {
      return { kind: "ready", insights: cached, fromCache: true };
    }
  }

  try {
    const insights = await generateAndCacheInsights(shopId, customerId, ctx);
    return { kind: "ready", insights, fromCache: false };
  } catch (err) {
    const cached = parseCustomerInsightsCache(customer.aiInsightsCache);
    if (cached) {
      return { kind: "ready", insights: cached, fromCache: true };
    }
    return {
      kind: "error",
      message: err instanceof Error ? err.message : "Could not generate insights.",
    };
  }
}
