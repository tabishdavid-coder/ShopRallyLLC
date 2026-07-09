import "server-only";

import type { ShopPlan } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { PLANS } from "@/lib/plans";
import { estimateShopMrrCents } from "@/lib/subscription";
import { getOnboardingSummary } from "@/server/platform/onboarding";
import { getPlatformLeadStats } from "@/server/platform/leads";
import { listPlatformShops } from "@/server/platform-shops";

export type PlatformRevenueByPlan = {
  plan: ShopPlan;
  label: string;
  shopCount: number;
  mrrCents: number;
};

export type PlatformGrowthTrendPoint = {
  label: string;
  newShops: number;
  newMrrCents: number;
};

export type PlatformGrowthStats = {
  payingShopCount: number;
  trialShopCount: number;
  activeShopCount: number;
  activeShopPrior30d: number;
  mrrCents: number;
  mrrPrior30dCents: number;
  arrCents: number;
  newShops30d: number;
  paidShopCount: number;
  trialsEndingSoon7d: number;
  openLeadCount: number;
  openTicketCount: number;
  atRiskCount: number;
  pastDueCount: number;
  suspendedCount: number;
  canceledCount: number;
  revenueByPlan: PlatformRevenueByPlan[];
  onboarding: {
    inPipelineCount: number;
    readyToLaunchCount: number;
    trialInPipelineCount: number;
  };
  growthTrend: PlatformGrowthTrendPoint[];
  totalEndCustomers: number;
};

function weekLabel(start: Date): string {
  return start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isTrialsEndingSoon(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  const days = (trialEndsAt.getTime() - Date.now()) / 86_400_000;
  return days >= 0 && days <= 7;
}

/** SaaS growth KPIs for the platform owner overview. */
export async function getPlatformGrowthStats(): Promise<PlatformGrowthStats> {
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const [
    shops,
    leadStats,
    onboardingSummary,
    payingShopCount,
    trialShopCount,
    pastDueCount,
    suspendedCount,
    canceledCount,
    openTicketCount,
    newShops30d,
    activeShopPrior30d,
    totalEndCustomers,
  ] = await Promise.all([
    listPlatformShops(),
    getPlatformLeadStats(),
    getOnboardingSummary(),
    prisma.shop.count({
      where: { billingStatus: "ACTIVE", status: { not: "SUSPENDED" } },
    }),
    prisma.shop.count({ where: { billingStatus: "TRIAL" } }),
    prisma.shop.count({ where: { billingStatus: "PAST_DUE" } }),
    prisma.shop.count({ where: { status: "SUSPENDED" } }),
    prisma.shop.count({ where: { billingStatus: "CANCELED" } }),
    prisma.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.shop.count({ where: { createdAt: { gte: since30d } } }),
    prisma.shop.count({
      where: {
        createdAt: { lt: since30d },
        billingStatus: { in: ["ACTIVE", "TRIAL"] },
        status: { not: "SUSPENDED" },
      },
    }),
    prisma.customer.count(),
  ]);

  const mrrCents = shops.reduce(
    (sum, s) => sum + estimateShopMrrCents(s.plan, s.billingStatus),
    0,
  );

  const newShopMrr30d = shops
    .filter((s) => s.createdAt >= since30d)
    .reduce((sum, s) => sum + estimateShopMrrCents(s.plan, s.billingStatus), 0);

  const mrrPrior30dCents = Math.max(0, mrrCents - newShopMrr30d);

  const trialsEndingSoon7d = shops.filter((s) => isTrialsEndingSoon(s.trialEndsAt)).length;

  const revenueByPlanMap = new Map<ShopPlan, { shopCount: number; mrrCents: number }>();
  for (const shop of shops) {
    const entry = revenueByPlanMap.get(shop.plan) ?? { shopCount: 0, mrrCents: 0 };
    entry.shopCount += 1;
    entry.mrrCents += estimateShopMrrCents(shop.plan, shop.billingStatus);
    revenueByPlanMap.set(shop.plan, entry);
  }

  const revenueByPlan = [...revenueByPlanMap.entries()]
    .map(([plan, row]) => ({
      plan,
      label: PLANS[plan].name,
      shopCount: row.shopCount,
      mrrCents: row.mrrCents,
    }))
    .sort((a, b) => b.mrrCents - a.mrrCents);

  const growthTrend: PlatformGrowthTrendPoint[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);

    const weekShops = shops.filter((s) => s.createdAt >= weekStart && s.createdAt <= weekEnd);
    growthTrend.push({
      label: weekLabel(weekStart),
      newShops: weekShops.length,
      newMrrCents: weekShops.reduce(
        (sum, s) => sum + estimateShopMrrCents(s.plan, s.billingStatus),
        0,
      ),
    });
  }

  const trialInPipelineCount = onboardingSummary.shops.filter(
    (s) => s.billingStatus === "TRIAL" && !s.isLive,
  ).length;

  return {
    payingShopCount,
    trialShopCount,
    activeShopCount: payingShopCount + trialShopCount,
    activeShopPrior30d,
    mrrCents,
    mrrPrior30dCents,
    arrCents: mrrCents * 12,
    newShops30d,
    paidShopCount: payingShopCount,
    trialsEndingSoon7d,
    openLeadCount: leadStats.openCount,
    openTicketCount,
    atRiskCount: pastDueCount + suspendedCount + canceledCount,
    pastDueCount,
    suspendedCount,
    canceledCount,
    revenueByPlan,
    onboarding: {
      inPipelineCount: onboardingSummary.inPipelineCount,
      readyToLaunchCount: onboardingSummary.readyToLaunchCount,
      trialInPipelineCount,
    },
    growthTrend,
    totalEndCustomers,
  };
}
