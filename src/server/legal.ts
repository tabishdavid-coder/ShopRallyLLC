import "server-only";

import { prisma } from "@/db/client";
import { AgreementType } from "@/generated/prisma";

export const REQUIRED_AGREEMENT_TYPES: AgreementType[] = [
  AgreementType.PLATFORM_TOS,
  AgreementType.PRIVACY_POLICY,
  AgreementType.ACCEPTABLE_USE,
];

export const FEATURE_AGREEMENT_TYPES = {
  payments: AgreementType.PAYMENT_ADDENDUM,
  sms: AgreementType.SMS_ADDENDUM,
} as const;

export const AGREEMENT_TYPE_LABELS: Record<AgreementType, string> = {
  [AgreementType.PLATFORM_TOS]: "Terms of Service",
  [AgreementType.PRIVACY_POLICY]: "Privacy Policy",
  [AgreementType.ACCEPTABLE_USE]: "Acceptable Use Policy",
  [AgreementType.DPA]: "Data Processing Agreement",
  [AgreementType.PAYMENT_ADDENDUM]: "Payment Processing Addendum",
  [AgreementType.SMS_ADDENDUM]: "SMS & Messaging Addendum",
  [AgreementType.CUSTOM_MSA]: "Enterprise Custom MSA",
};

export const AGREEMENT_PUBLIC_PATHS: Record<AgreementType, string> = {
  [AgreementType.PLATFORM_TOS]: "/legal/terms",
  [AgreementType.PRIVACY_POLICY]: "/legal/privacy",
  [AgreementType.ACCEPTABLE_USE]: "/legal/aup",
  [AgreementType.DPA]: "/legal/dpa",
  [AgreementType.PAYMENT_ADDENDUM]: "/legal/payment-addendum",
  [AgreementType.SMS_ADDENDUM]: "/legal/sms-addendum",
  [AgreementType.CUSTOM_MSA]: "/settings/legal",
};

export async function getCurrentAgreementDocument(type: AgreementType) {
  return prisma.agreementDocument.findFirst({
    where: { type, isCurrent: true },
  });
}

export async function getCurrentAgreementDocuments(types?: AgreementType[]) {
  const filterTypes = types ?? REQUIRED_AGREEMENT_TYPES;
  const docs = await prisma.agreementDocument.findMany({
    where: {
      isCurrent: true,
      type: { in: filterTypes },
    },
  });
  return new Map(docs.map((doc) => [doc.type, doc]));
}

export async function listAgreementDocuments() {
  return prisma.agreementDocument.findMany({
    orderBy: [{ type: "asc" }, { publishedAt: "desc" }],
  });
}

export async function listShopLegalAcceptances(shopId: string) {
  const rows = await prisma.legalAcceptance.findMany({
    where: { shopId },
    orderBy: [{ agreementType: "asc" }, { acceptedAt: "desc" }],
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  const latestByType = new Map<AgreementType, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latestByType.has(row.agreementType)) {
      latestByType.set(row.agreementType, row);
    }
  }
  return latestByType;
}

function acceptanceMatchesDocument(
  acceptance: { contentHash: string; agreementVersion: string },
  doc: { contentHash: string; version: string },
): boolean {
  return (
    acceptance.contentHash === doc.contentHash ||
    acceptance.agreementVersion === doc.version
  );
}

export async function getLatestShopAcceptance(
  shopId: string,
  type: AgreementType,
) {
  return prisma.legalAcceptance.findFirst({
    where: { shopId, agreementType: type },
    orderBy: { acceptedAt: "desc" },
  });
}

/** Whether the shop has accepted the current version of a specific agreement type. */
export async function shopHasCurrentAgreement(
  shopId: string,
  type: AgreementType,
): Promise<boolean> {
  const [doc, acceptance] = await Promise.all([
    getCurrentAgreementDocument(type),
    getLatestShopAcceptance(shopId, type),
  ]);
  if (!doc || !acceptance) return false;
  return acceptanceMatchesDocument(acceptance, doc);
}

export async function checkShopLegalCompliance(shopId: string): Promise<{
  compliant: boolean;
  missing: AgreementType[];
  pendingReaccept: boolean;
  outdatedTypes: AgreementType[];
}> {
  const [currentDocs, acceptances] = await Promise.all([
    getCurrentAgreementDocuments(),
    prisma.legalAcceptance.findMany({
      where: {
        shopId,
        agreementType: { in: REQUIRED_AGREEMENT_TYPES },
      },
      orderBy: { acceptedAt: "desc" },
    }),
  ]);

  const latestAcceptanceByType = new Map<AgreementType, (typeof acceptances)[number]>();
  for (const row of acceptances) {
    if (!latestAcceptanceByType.has(row.agreementType)) {
      latestAcceptanceByType.set(row.agreementType, row);
    }
  }

  const missing: AgreementType[] = [];
  const outdatedTypes: AgreementType[] = [];
  let pendingReaccept = false;

  for (const type of REQUIRED_AGREEMENT_TYPES) {
    const doc = currentDocs.get(type);
    if (!doc) {
      missing.push(type);
      continue;
    }

    const acceptance = latestAcceptanceByType.get(type);
    if (!acceptance) {
      missing.push(type);
      continue;
    }

    if (!acceptanceMatchesDocument(acceptance, doc)) {
      missing.push(type);
      outdatedTypes.push(type);
      if (doc.requiresReaccept) pendingReaccept = true;
    }
  }

  return {
    compliant: missing.length === 0,
    missing,
    pendingReaccept,
    outdatedTypes,
  };
}

export async function countLegalAcceptancesByDocumentVersion() {
  const grouped = await prisma.legalAcceptance.groupBy({
    by: ["agreementType", "agreementVersion"],
    _count: { _all: true },
  });
  return grouped;
}

/** Bump semver patch (1.0.0 → 1.0.1) or minor (1.0.0 → 1.1.0). */
export function bumpAgreementVersion(current: string, bump: "patch" | "minor"): string {
  const parts = current.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return bump === "minor" ? "1.1.0" : "1.0.1";
  }
  if (bump === "minor") {
    return `${parts[0]}.${parts[1] + 1}.0`;
  }
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

export type ShopDataExportSummary = {
  exportedAt: string;
  shop: {
    id: string;
    name: string;
    code: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
  };
  counts: {
    customers: number;
    vehicles: number;
    repairOrders: number;
    invoices: number;
    employees: number;
  };
  note: string;
};

/** MVP stub — summary counts only, not full record export. */
export async function buildShopDataExportSummary(
  shopId: string,
): Promise<ShopDataExportSummary> {
  const [shop, customers, vehicles, repairOrders, invoices, employees] =
    await Promise.all([
      prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          name: true,
          code: true,
          email: true,
          phone: true,
          city: true,
          state: true,
        },
      }),
      prisma.customer.count({ where: { shopId } }),
      prisma.vehicle.count({ where: { shopId } }),
      prisma.repairOrder.count({ where: { shopId } }),
      prisma.invoice.count({ where: { shopId } }),
      prisma.membership.count({ where: { shopId } }),
    ]);

  if (!shop) throw new Error("Shop not found");

  return {
    exportedAt: new Date().toISOString(),
    shop,
    counts: {
      customers,
      vehicles,
      repairOrders,
      invoices,
      employees,
    },
    note:
      "This is a summary export stub. Full CSV/record export will be available in a future release.",
  };
}
