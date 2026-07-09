import "server-only";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";

export type PlatformRetentionRunRow = {
  id: string;
  shopId: string;
  shopName: string;
  shopMasterId: string | null;
  summary: string;
  createdAt: Date;
  messagesPurged: number | null;
  consentRecordsPurged: number | null;
  customersAnonymized: number | null;
};

function metadataCounts(metadata: unknown): {
  messagesPurged: number | null;
  consentRecordsPurged: number | null;
  customersAnonymized: number | null;
} {
  if (!metadata || typeof metadata !== "object") {
    return { messagesPurged: null, consentRecordsPurged: null, customersAnonymized: null };
  }
  const m = metadata as Record<string, unknown>;
  const num = (key: string) => (typeof m[key] === "number" ? (m[key] as number) : null);
  return {
    messagesPurged: num("messagesPurged"),
    consentRecordsPurged: num("consentRecordsPurged"),
    customersAnonymized: num("customersAnonymized"),
  };
}

/** Recent retention job runs across all shops — platform operator view only. */
export async function listRecentRetentionRuns(
  limit = 20,
): Promise<PlatformRetentionRunRow[]> {
  const rows = await prisma.shopAuditEvent.findMany({
    where: { eventType: ShopAuditEventType.RETENTION_JOB_RUN },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      shopId: true,
      summary: true,
      createdAt: true,
      metadata: true,
      shop: { select: { name: true, masterId: true } },
    },
  });

  return rows.map((row) => {
    const counts = metadataCounts(row.metadata);
    return {
      id: row.id,
      shopId: row.shopId,
      shopName: row.shop.name,
      shopMasterId: row.shop.masterId,
      summary: row.summary,
      createdAt: row.createdAt,
      ...counts,
    };
  });
}
