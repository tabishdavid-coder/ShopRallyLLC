import "server-only";

import { prisma } from "@/db/client";
import type { CannedJobDetail, CannedJobSummary } from "@/lib/canned-job-types";

export type { CannedJobDetail, CannedJobSummary } from "@/lib/canned-job-types";

const summarySelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  isActive: true,
  usageCount: true,
  lastUsedAt: true,
  updatedAt: true,
  sortOrder: true,
  laborLines: { select: { hours: true }, orderBy: { sortOrder: "asc" as const } },
  partLines: { select: { costCents: true, quantity: true }, orderBy: { sortOrder: "asc" as const } },
  feeLines: { select: { id: true }, orderBy: { sortOrder: "asc" as const } },
  discountLines: { select: { id: true }, orderBy: { sortOrder: "asc" as const } },
  inspectionLines: { select: { hours: true }, orderBy: { sortOrder: "asc" as const } },
};

function toSummary(row: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  isActive: boolean;
  usageCount: number;
  lastUsedAt: Date | null;
  updatedAt: Date;
  sortOrder: number;
  laborLines: { hours: number }[];
  partLines: { costCents: number; quantity: number }[];
  feeLines: { id: string }[];
  discountLines: { id: string }[];
  inspectionLines: { hours: number }[];
}): CannedJobSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    isActive: row.isActive,
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt,
    updatedAt: row.updatedAt,
    sortOrder: row.sortOrder,
    laborLineCount: row.laborLines.length,
    partLineCount: row.partLines.length,
    feeLineCount: row.feeLines.length,
    discountLineCount: row.discountLines.length,
    inspectionLineCount: row.inspectionLines.length,
    laborHours:
      row.laborLines.reduce((s, l) => s + l.hours, 0) +
      row.inspectionLines.reduce((s, l) => s + l.hours, 0),
    partsCostCents: row.partLines.reduce((s, p) => s + p.costCents * p.quantity, 0),
  };
}

/** Active canned jobs for the estimate picker (search + category filter). */
export async function listCannedJobsForPicker(
  shopId: string,
  opts?: { q?: string; category?: string },
): Promise<CannedJobSummary[]> {
  const q = opts?.q?.trim();
  const rows = await prisma.cannedJob.findMany({
    where: {
      shopId,
      isActive: true,
      ...(opts?.category ? { category: opts.category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ usageCount: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: summarySelect,
  });
  return rows.map(toSummary);
}

/** All canned jobs for the management page (includes inactive). */
export async function listCannedJobs(
  shopId: string,
  opts?: { q?: string; category?: string; activeOnly?: boolean },
): Promise<CannedJobSummary[]> {
  const q = opts?.q?.trim();
  const rows = await prisma.cannedJob.findMany({
    where: {
      shopId,
      ...(opts?.activeOnly ? { isActive: true } : {}),
      ...(opts?.category ? { category: opts.category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: summarySelect,
  });
  return rows.map(toSummary);
}

export async function getCannedJob(shopId: string, id: string): Promise<CannedJobDetail | null> {
  const row = await prisma.cannedJob.findFirst({
    where: { id, shopId },
    select: {
      ...summarySelect,
      laborLines: {
        select: { id: true, description: true, hours: true, flatAmountCents: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      partLines: {
        select: {
          id: true,
          lineType: true,
          brand: true,
          description: true,
          partNumber: true,
          costCents: true,
          quantity: true,
          inventoryPartId: true,
          tireStockId: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      feeLines: {
        select: {
          id: true,
          name: true,
          method: true,
          base: true,
          amount: true,
          capCents: true,
          taxable: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      discountLines: {
        select: {
          id: true,
          name: true,
          method: true,
          base: true,
          amount: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      inspectionLines: {
        select: {
          id: true,
          name: true,
          description: true,
          inspectionTemplateId: true,
          hours: true,
          flatAmountCents: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!row) return null;
  const summary = toSummary(row);
  return {
    ...summary,
    laborLines: row.laborLines,
    partLines: row.partLines,
    feeLines: row.feeLines,
    discountLines: row.discountLines,
    inspectionLines: row.inspectionLines,
  };
}

/** Distinct categories in use for filter dropdowns. */
export async function listCannedJobCategories(shopId: string): Promise<string[]> {
  const rows = await prisma.cannedJob.findMany({
    where: { shopId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category!).filter(Boolean);
}
