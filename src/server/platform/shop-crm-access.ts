import "server-only";

import { headers } from "next/headers";

import { PlatformAuditEventType } from "@/generated/prisma";
import { prisma } from "@/db/client";
import { getPlatformContext, platformUserDisplayName } from "@/lib/platform";
import { recordPlatformAuditEvent } from "@/server/platform/audit";

/** Log when a platform operator enters a tenant Shop CRM (compliance trail). */
export async function recordShopCrmEntered(shopId: string, source?: string) {
  const ctx = await getPlatformContext();
  if (!ctx.isPlatformAdmin || !ctx.platformId) return;

  const h = await headers();
  const pathname = h.get("x-pathname") ?? null;
  const referer = h.get("referer") ?? null;

  await recordPlatformAuditEvent({
    platformId: ctx.platformId,
    shopId,
    eventType: PlatformAuditEventType.SHOP_CRM_ENTERED,
    actorUserId: ctx.user.id.startsWith("stub-") ? null : ctx.user.id,
    actorEmail: ctx.user.email,
    metadata: {
      source: source ?? "switchShop",
      pathname,
      referer,
      operator: platformUserDisplayName(ctx.user),
    },
  });
}

export async function listShopCrmAccessEvents(shopId: string, limit = 15) {
  return prisma.platformAuditEvent.findMany({
    where: {
      shopId,
      eventType: PlatformAuditEventType.SHOP_CRM_ENTERED,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actorEmail: true,
      metadata: true,
      createdAt: true,
    },
  });
}

export type PlatformShopCrmAccessRow = {
  id: string;
  shopId: string;
  shopName: string;
  actorEmail: string | null;
  metadata: unknown;
  createdAt: Date;
};

/** Cross-tenant operator entries — Legal & compliance feed. */
export async function listRecentShopCrmAccessEvents(
  limit = 25,
): Promise<PlatformShopCrmAccessRow[]> {
  const rows = await prisma.platformAuditEvent.findMany({
    where: { eventType: PlatformAuditEventType.SHOP_CRM_ENTERED },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      shopId: true,
      actorEmail: true,
      metadata: true,
      createdAt: true,
      shop: { select: { name: true } },
    },
  });

  return rows
    .filter((r): r is typeof r & { shopId: string; shop: { name: string } } => r.shopId != null)
    .map((r) => ({
      id: r.id,
      shopId: r.shopId,
      shopName: r.shop.name,
      actorEmail: r.actorEmail,
      metadata: r.metadata,
      createdAt: r.createdAt,
    }));
}
