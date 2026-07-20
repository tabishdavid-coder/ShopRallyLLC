import "server-only";

import { prisma } from "@/db/client";
import type { DecodeUsageKind, ShopPlan } from "@/generated/prisma";
import {
  PLANS,
  resolvePlanFeatures,
  vinPlateDecodeOverageCents,
} from "@/lib/plans";

function calendarMonthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Count successful VIN + plate decodes for the current calendar month. */
export async function countDecodeUsageThisMonth(shopId: string): Promise<number> {
  return prisma.decodeUsageLog.count({
    where: { shopId, createdAt: { gte: calendarMonthStart() } },
  });
}

/**
 * Record one successful provider hit (VIN decode or plate lookup that returned data).
 * Failed lookups must not call this. Ignition (NHTSA VIN) is unlimited / unmetered for billing;
 * logging remains for analytics. Plate→VIN is Pro+ only.
 */
export async function recordDecodeUsage(
  shopId: string,
  kind: DecodeUsageKind,
): Promise<void> {
  await prisma.decodeUsageLog.create({
    data: { shopId, kind },
  });
}

export type DecodeUsageSummary = {
  usedThisMonth: number;
  limit: number | null;
  unlimited: boolean;
  overageCount: number;
  overageCentsEstimate: number;
  plan: ShopPlan;
};

export async function getDecodeUsageSummary(args: {
  shopId: string;
  plan: ShopPlan;
  planFeatures?: unknown;
}): Promise<DecodeUsageSummary> {
  const features = resolvePlanFeatures(args);
  const usedThisMonth = await countDecodeUsageThisMonth(args.shopId);
  const limit = features.maxVinPlateDecodesPerMonth;
  const overageCount = limit === null ? 0 : Math.max(0, usedThisMonth - limit);

  return {
    usedThisMonth,
    limit,
    unlimited: limit === null,
    overageCount,
    overageCentsEstimate: vinPlateDecodeOverageCents(usedThisMonth, limit),
    plan: args.plan,
  };
}

/** Soft notice when a metered plan is at/over its decode allowance (legacy; Ignition is unlimited). */
export function decodeOverageNotice(summary: DecodeUsageSummary): string | null {
  if (summary.unlimited || summary.limit === null) return null;
  if (summary.usedThisMonth < summary.limit) return null;
  const overage =
    summary.overageCentsEstimate > 0
      ? ` Estimated overage this month: $${(summary.overageCentsEstimate / 100).toFixed(0)} ($10 per additional 100).`
      : "";
  return `You've used ${summary.usedThisMonth} of ${summary.limit} included paid VIN/plate lookups this month.${overage}`;
}

export function planDecodeLimit(plan: ShopPlan): number | null {
  return PLANS[plan].features.maxVinPlateDecodesPerMonth;
}
