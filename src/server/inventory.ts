import "server-only";

import { prisma } from "@/db/client";
import type { Prisma } from "@/generated/prisma";

export type InventoryPartRow = {
  id: string;
  partNumber: string;
  description: string;
  brand: string | null;
  category: string | null;
  vendorName: string | null;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQty: number;
  costCents: number;
  retailCents: number;
  binLocation: string | null;
  active: boolean;
};

export type InventoryListResult = {
  rows: InventoryPartRow[];
  total: number;
  page: number;
  perPage: number;
};

export type InventoryStats = {
  totalParts: number;
  totalValueCents: number;
  lowStockCount: number;
};

export type InventoryAdjustmentRow = {
  id: string;
  delta: number;
  reason: string;
  adjustedBy: string | null;
  createdAt: Date;
  quantityAfter: number;
};

export type InventoryPartDetail = InventoryPartRow & {
  vendorPartNumber: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  adjustments: InventoryAdjustmentRow[];
};

function inventorySearchWhere(shopId: string, q: string): Prisma.InventoryPartWhereInput {
  const term = q.trim();
  return {
    shopId,
    active: true,
    OR: [
      { partNumber: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { vendorName: { contains: term, mode: "insensitive" } },
      { binLocation: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
    ],
  };
}

export async function getInventoryParts(opts: {
  shopId: string;
  q?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  perPage?: number;
}): Promise<InventoryListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = opts.perPage ?? 25;
  const q = opts.q?.trim();

  const where: Prisma.InventoryPartWhereInput = {
    shopId: opts.shopId,
    active: true,
    ...(q ? inventorySearchWhere(opts.shopId, q) : {}),
    ...(opts.category && opts.category !== "all" ? { category: opts.category } : {}),
  };

  if (opts.lowStock) {
    const all = await prisma.inventoryPart.findMany({
      where: {
        shopId: opts.shopId,
        active: true,
        reorderPoint: { gt: 0 },
        ...(q ? inventorySearchWhere(opts.shopId, q) : {}),
        ...(opts.category && opts.category !== "all" ? { category: opts.category } : {}),
      },
      orderBy: [{ partNumber: "asc" }],
    });
    const filtered = all.filter((p) => p.quantityOnHand <= p.reorderPoint);
    const total = filtered.length;
    const rows = filtered.slice((page - 1) * perPage, page * perPage).map(partRowSelect);
    return { rows, total, page, perPage };
  }

  const [total, parts] = await Promise.all([
    prisma.inventoryPart.count({ where }),
    prisma.inventoryPart.findMany({
      where,
      orderBy: [{ partNumber: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: partRowSelectFields,
    }),
  ]);

  return { rows: parts, total, page, perPage };
}

const partRowSelectFields = {
  id: true,
  partNumber: true,
  description: true,
  brand: true,
  category: true,
  vendorName: true,
  quantityOnHand: true,
  reorderPoint: true,
  reorderQty: true,
  costCents: true,
  retailCents: true,
  binLocation: true,
  active: true,
} as const;

function partRowSelect(p: {
  id: string;
  partNumber: string;
  description: string;
  brand: string | null;
  category: string | null;
  vendorName: string | null;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQty: number;
  costCents: number;
  retailCents: number;
  binLocation: string | null;
  active: boolean;
}): InventoryPartRow {
  return p;
}

export async function getInventoryStats(shopId: string): Promise<InventoryStats> {
  const parts = await prisma.inventoryPart.findMany({
    where: { shopId, active: true },
    select: {
      quantityOnHand: true,
      reorderPoint: true,
      costCents: true,
    },
  });

  const totalParts = parts.length;
  const totalValueCents = parts.reduce(
    (sum, p) => sum + p.quantityOnHand * p.costCents,
    0,
  );
  const lowStockCount = parts.filter(
    (p) => p.reorderPoint > 0 && p.quantityOnHand <= p.reorderPoint,
  ).length;

  return { totalParts, totalValueCents, lowStockCount };
}

export async function getInventoryCategories(shopId: string): Promise<string[]> {
  const rows = await prisma.inventoryPart.findMany({
    where: { shopId, active: true, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category!).filter(Boolean);
}

export async function getInventoryPart(
  shopId: string,
  id: string,
): Promise<InventoryPartDetail | null> {
  const part = await prisma.inventoryPart.findFirst({
    where: { id, shopId, active: true },
    include: {
      adjustments: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!part) return null;

  let runningQty = part.quantityOnHand;
  const adjustments: InventoryAdjustmentRow[] = part.adjustments.map((a) => {
    const row: InventoryAdjustmentRow = {
      id: a.id,
      delta: a.delta,
      reason: a.reason,
      adjustedBy: a.adjustedBy,
      createdAt: a.createdAt,
      quantityAfter: runningQty,
    };
    runningQty -= a.delta;
    return row;
  });

  return {
    id: part.id,
    partNumber: part.partNumber,
    description: part.description,
    brand: part.brand,
    category: part.category,
    vendorName: part.vendorName,
    vendorPartNumber: part.vendorPartNumber,
    quantityOnHand: part.quantityOnHand,
    reorderPoint: part.reorderPoint,
    reorderQty: part.reorderQty,
    costCents: part.costCents,
    retailCents: part.retailCents,
    binLocation: part.binLocation,
    notes: part.notes,
    active: part.active,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
    adjustments,
  };
}
