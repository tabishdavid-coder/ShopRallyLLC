import "server-only";

import { prisma } from "@/db/client";

export type ShopCustomAgreementView = {
  id: string;
  shopId: string;
  legalEntityName: string;
  version: string;
  contentHtml: string;
  contentHash: string;
  effectiveDate: Date;
  notes: string | null;
  uploadedAt: Date;
  uploadedByName: string;
};

export async function getShopCustomAgreement(
  shopId: string,
): Promise<ShopCustomAgreementView | null> {
  const row = await prisma.shopCustomAgreement.findUnique({
    where: { shopId },
    include: {
      uploadedBy: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!row) return null;

  const uploadedByName =
    [row.uploadedBy.firstName, row.uploadedBy.lastName].filter(Boolean).join(" ") ||
    row.uploadedBy.email;

  return {
    id: row.id,
    shopId: row.shopId,
    legalEntityName: row.legalEntityName,
    version: row.version,
    contentHtml: row.contentHtml,
    contentHash: row.contentHash,
    effectiveDate: row.effectiveDate,
    notes: row.notes,
    uploadedAt: row.uploadedAt,
    uploadedByName,
  };
}

export async function listShopsWithCustomMsa() {
  return prisma.shopCustomAgreement.findMany({
    orderBy: { uploadedAt: "desc" },
    include: {
      shop: { select: { id: true, name: true, code: true, plan: true } },
    },
  });
}
