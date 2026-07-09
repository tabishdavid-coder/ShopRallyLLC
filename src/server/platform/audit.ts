import "server-only";

import { prisma } from "@/db/client";
import {
  PlatformAuditEventType,
  ShopProvisionMethod,
  type Prisma,
} from "@/generated/prisma";

export type RecordPlatformAuditInput = {
  platformId: string;
  shopId?: string | null;
  eventType: PlatformAuditEventType;
  actorUserId?: string | null;
  actorEmail?: string | null;
  method?: ShopProvisionMethod | null;
  metadata?: Record<string, unknown> | null;
};

/** Append an immutable platform audit event (shop create, intake, activation). */
export async function recordPlatformAuditEvent(input: RecordPlatformAuditInput) {
  return prisma.platformAuditEvent.create({
    data: {
      platformId: input.platformId,
      shopId: input.shopId ?? null,
      eventType: input.eventType,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      method: input.method ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export { listShopAuditEvents } from "@/server/shop-audit";
