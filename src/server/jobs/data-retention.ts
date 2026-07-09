import "server-only";

import { prisma } from "@/db/client";
import { Prisma, ShopAuditEventType, ShopStatus } from "@/generated/prisma";
import {
  DEFAULT_RETENTION_DAYS,
  buildCustomerAnonymizationData,
} from "@/lib/data-compliance";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export type RetentionJobResult = {
  messagesPurged: number;
  consentRecordsPurged: number;
  aiCachesPurged: number;
  customersAnonymized: number;
};

export type PlatformRetentionJobResult = {
  shopsProcessed: number;
  shopsFailed: number;
  totals: RetentionJobResult;
};

async function resolvePolicy(shopId: string) {
  const row = await prisma.shopDataPolicy.findUnique({ where: { shopId } });
  return {
    messageRetentionDays: row?.messageRetentionDays ?? DEFAULT_RETENTION_DAYS.messages,
    consentRetentionDays: row?.consentRetentionDays ?? DEFAULT_RETENTION_DAYS.consent,
    anonymizeAfterDeleteDays:
      row?.anonymizeAfterDeleteDays ?? DEFAULT_RETENTION_DAYS.anonymizeGrace,
  };
}

async function anonymizeDueCustomers(
  shopId: string,
  graceDays: number,
): Promise<number> {
  const cutoff = new Date(Date.now() - graceDays * 86_400_000);
  const due = await prisma.customer.findMany({
    where: {
      shopId,
      deletedAt: { not: null, lte: cutoff },
      anonymizedAt: null,
    },
    select: { id: true, firstName: true, lastName: true },
    take: 200,
  });

  for (const customer of due) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: buildCustomerAnonymizationData(),
    });

    await recordShopAuditEventSafe({
      shopId,
      eventType: ShopAuditEventType.CUSTOMER_ANONYMIZED,
      summary: `Customer profile anonymized (${customer.firstName} ${customer.lastName})`.trim(),
      metadata: { customerId: customer.id },
      actor: null,
    });
  }

  return due.length;
}

/** Purge stale comms/consent caches and anonymize soft-deleted customers past grace. */
export async function runShopRetentionJob(shopId: string): Promise<RetentionJobResult> {
  const policy = await resolvePolicy(shopId);
  const now = Date.now();

  const messageCutoff = new Date(now - policy.messageRetentionDays * 86_400_000);
  const consentCutoff = new Date(now - policy.consentRetentionDays * 86_400_000);
  const aiCutoff = new Date(now - 7 * 86_400_000);

  const [messagesPurged, consentRecordsPurged, aiCachesPurged, customersAnonymized] =
    await Promise.all([
      prisma.message
        .deleteMany({
          where: { shopId, createdAt: { lt: messageCutoff } },
        })
        .then((r) => r.count),
      prisma.consentRecord
        .deleteMany({
          where: { shopId, createdAt: { lt: consentCutoff } },
        })
        .then((r) => r.count),
      prisma.customer
        .updateMany({
          where: {
            shopId,
            aiInsightsCache: { not: Prisma.AnyNull },
            updatedAt: { lt: aiCutoff },
          },
          data: { aiInsightsCache: Prisma.JsonNull },
        })
        .then((r) => r.count),
      anonymizeDueCustomers(shopId, policy.anonymizeAfterDeleteDays),
    ]);

  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.RETENTION_JOB_RUN,
    summary: "Data retention job completed",
    metadata: { messagesPurged, consentRecordsPurged, aiCachesPurged, customersAnonymized },
    actor: null,
  });

  return { messagesPurged, consentRecordsPurged, aiCachesPurged, customersAnonymized };
}

/** Nightly platform job — runs retention for every active/trial shop tenant. */
export async function runPlatformDataRetentionJob(): Promise<PlatformRetentionJobResult> {
  const shops = await prisma.shop.findMany({
    where: { status: { in: [ShopStatus.ACTIVE, ShopStatus.TRIAL, ShopStatus.SUSPENDED] } },
    select: { id: true },
  });

  const totals: RetentionJobResult = {
    messagesPurged: 0,
    consentRecordsPurged: 0,
    aiCachesPurged: 0,
    customersAnonymized: 0,
  };
  let shopsFailed = 0;

  for (const { id: shopId } of shops) {
    try {
      const result = await runShopRetentionJob(shopId);
      totals.messagesPurged += result.messagesPurged;
      totals.consentRecordsPurged += result.consentRecordsPurged;
      totals.aiCachesPurged += result.aiCachesPurged;
      totals.customersAnonymized += result.customersAnonymized;
    } catch (error) {
      shopsFailed += 1;
      console.error("[data-retention] shop job failed:", shopId, error);
    }
  }

  return {
    shopsProcessed: shops.length,
    shopsFailed,
    totals,
  };
}
