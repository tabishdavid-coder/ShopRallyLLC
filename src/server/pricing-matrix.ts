import "server-only";

import { prisma } from "@/db/client";
import { partRetail, laborRate, type PartTier, type LaborTier } from "@/lib/matrix";

/** Shop parts + labor pricing tiers (Settings → Markups). */
export async function getShopMatrices(shopId: string): Promise<{ partTiers: PartTier[]; laborTiers: LaborTier[] }> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      partMatrix: { orderBy: { sortOrder: "asc" }, select: { minCents: true, maxCents: true, multiplier: true } },
      laborMatrix: { orderBy: { sortOrder: "asc" }, select: { minHours: true, maxHours: true, multiplier: true } },
    },
  });
  return {
    partTiers: shop?.partMatrix ?? [],
    laborTiers: shop?.laborMatrix ?? [],
  };
}

/** Retail cents for a part cost using the shop parts matrix. */
export function shopPartRetail(costCents: number, partTiers: PartTier[]): number {
  return partRetail(costCents, partTiers);
}

/** Effective labor rate (cents) for hours using the shop labor matrix. */
export function shopLaborRate(baseRateCents: number, hours: number, laborTiers: LaborTier[]): number {
  return laborRate(baseRateCents, hours, laborTiers);
}
