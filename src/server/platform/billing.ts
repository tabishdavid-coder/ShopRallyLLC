import "server-only";

import type { BillingStatus, ShopPlan, StripeConnectStatus } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { PLANS, billingStatusLabel } from "@/lib/plans";
import { estimateShopMrrCents } from "@/lib/subscription";

export type PlatformBillingShopRow = {
  id: string;
  name: string;
  code: string;
  plan: ShopPlan;
  planLabel: string;
  billingStatus: BillingStatus;
  billingLabel: string;
  trialEndsAt: Date | null;
  mrrCents: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeConnectStatus: StripeConnectStatus;
  stripeConnectAccountId: string | null;
  createdAt: Date;
};

export type PlatformBillingOverview = {
  mrrCents: number;
  trialCount: number;
  activePaidCount: number;
  pastDueCount: number;
  canceledCount: number;
  planMix: { plan: ShopPlan; label: string; count: number; mrrCents: number }[];
  shops: PlatformBillingShopRow[];
};

export async function getPlatformBillingOverview(filter?: {
  billing?: "all" | "trial" | "past_due" | "active" | "canceled";
}): Promise<PlatformBillingOverview> {
  const billingFilter = filter?.billing ?? "all";

  const where =
    billingFilter === "trial"
      ? { billingStatus: "TRIAL" as const }
      : billingFilter === "past_due"
        ? { billingStatus: "PAST_DUE" as const }
        : billingFilter === "active"
          ? { billingStatus: "ACTIVE" as const }
          : billingFilter === "canceled"
            ? { billingStatus: "CANCELED" as const }
            : {};

  const shops = await prisma.shop.findMany({
    where,
    orderBy: [{ billingStatus: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      plan: true,
      billingStatus: true,
      trialEndsAt: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripeConnectStatus: true,
      stripeConnectAccountId: true,
      createdAt: true,
    },
  });

  const [trialCount, pastDueCount, canceledCount, activePaidCount] = await Promise.all([
    prisma.shop.count({ where: { billingStatus: "TRIAL" } }),
    prisma.shop.count({ where: { billingStatus: "PAST_DUE" } }),
    prisma.shop.count({ where: { billingStatus: "CANCELED" } }),
    prisma.shop.count({ where: { billingStatus: "ACTIVE" } }),
  ]);

  const rows: PlatformBillingShopRow[] = shops.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    plan: s.plan,
    planLabel: PLANS[s.plan].name,
    billingStatus: s.billingStatus,
    billingLabel: billingStatusLabel(s.billingStatus),
    trialEndsAt: s.trialEndsAt,
    mrrCents: estimateShopMrrCents(s.plan, s.billingStatus),
    stripeCustomerId: s.stripeCustomerId,
    stripeSubscriptionId: s.stripeSubscriptionId,
    stripeConnectStatus: s.stripeConnectStatus,
    stripeConnectAccountId: s.stripeConnectAccountId,
    createdAt: s.createdAt,
  }));

  const mrrCents = rows.reduce((sum, s) => sum + s.mrrCents, 0);

  const planMap = new Map<ShopPlan, { count: number; mrrCents: number }>();
  for (const row of rows) {
    const cur = planMap.get(row.plan) ?? { count: 0, mrrCents: 0 };
    planMap.set(row.plan, {
      count: cur.count + 1,
      mrrCents: cur.mrrCents + row.mrrCents,
    });
  }

  const planMix = [...planMap.entries()]
    .map(([plan, stats]) => ({
      plan,
      label: PLANS[plan].name,
      count: stats.count,
      mrrCents: stats.mrrCents,
    }))
    .sort((a, b) => b.mrrCents - a.mrrCents);

  return {
    mrrCents,
    trialCount,
    activePaidCount,
    pastDueCount,
    canceledCount,
    planMix,
    shops: rows,
  };
}
