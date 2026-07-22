import "server-only";

import { prisma } from "@/db/client";
import type { Prisma, TireCondition } from "@/generated/prisma";

export type TireStockRow = {
  id: string;
  stockNumber: string;
  brand: string;
  model: string;
  size: string;
  loadSpeed: string | null;
  condition: TireCondition;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQty: number;
  costCents: number;
  retailCents: number;
  binLocation: string | null;
  dotCode: string | null;
  treadDepth32nds: number | null;
  active: boolean;
};

export type TireStockListResult = {
  rows: TireStockRow[];
  total: number;
  page: number;
  perPage: number;
};

export type TireStockStats = {
  totalSkus: number;
  totalUnits: number;
  totalValueCents: number;
  lowStockCount: number;
};

export type TireStockAdjustmentRow = {
  id: string;
  delta: number;
  reason: string;
  adjustedBy: string | null;
  createdAt: Date;
  quantityAfter: number;
};

export type TireStockDetail = TireStockRow & {
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  adjustments: TireStockAdjustmentRow[];
};

const rowSelectFields = {
  id: true,
  stockNumber: true,
  brand: true,
  model: true,
  size: true,
  loadSpeed: true,
  condition: true,
  quantityOnHand: true,
  reorderPoint: true,
  reorderQty: true,
  costCents: true,
  retailCents: true,
  binLocation: true,
  dotCode: true,
  treadDepth32nds: true,
  active: true,
} as const;

function tireSearchWhere(shopId: string, q: string): Prisma.TireStockWhereInput {
  const term = q.trim();
  return {
    shopId,
    active: true,
    OR: [
      { stockNumber: { contains: term, mode: "insensitive" } },
      { brand: { contains: term, mode: "insensitive" } },
      { model: { contains: term, mode: "insensitive" } },
      { size: { contains: term, mode: "insensitive" } },
      { loadSpeed: { contains: term, mode: "insensitive" } },
      { binLocation: { contains: term, mode: "insensitive" } },
      { dotCode: { contains: term, mode: "insensitive" } },
    ],
  };
}

export async function getTireStockList(opts: {
  shopId: string;
  q?: string;
  condition?: TireCondition | "all";
  lowStock?: boolean;
  page?: number;
  perPage?: number;
}): Promise<TireStockListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = opts.perPage ?? 25;
  const q = opts.q?.trim();

  const where: Prisma.TireStockWhereInput = {
    shopId: opts.shopId,
    active: true,
    ...(q ? tireSearchWhere(opts.shopId, q) : {}),
    ...(opts.condition && opts.condition !== "all" ? { condition: opts.condition } : {}),
  };

  if (opts.lowStock) {
    const all = await prisma.tireStock.findMany({
      where: {
        shopId: opts.shopId,
        active: true,
        reorderPoint: { gt: 0 },
        ...(q ? tireSearchWhere(opts.shopId, q) : {}),
        ...(opts.condition && opts.condition !== "all" ? { condition: opts.condition } : {}),
      },
      orderBy: [{ stockNumber: "asc" }],
      select: rowSelectFields,
    });
    const filtered = all.filter((t) => t.quantityOnHand <= t.reorderPoint);
    const total = filtered.length;
    const rows = filtered.slice((page - 1) * perPage, page * perPage);
    return { rows, total, page, perPage };
  }

  const [total, tires] = await Promise.all([
    prisma.tireStock.count({ where }),
    prisma.tireStock.findMany({
      where,
      orderBy: [{ stockNumber: "asc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: rowSelectFields,
    }),
  ]);

  return { rows: tires, total, page, perPage };
}

export async function getTireStockStats(shopId: string): Promise<TireStockStats> {
  const tires = await prisma.tireStock.findMany({
    where: { shopId, active: true },
    select: {
      quantityOnHand: true,
      reorderPoint: true,
      costCents: true,
    },
  });

  const totalSkus = tires.length;
  const totalUnits = tires.reduce((sum, t) => sum + t.quantityOnHand, 0);
  const totalValueCents = tires.reduce(
    (sum, t) => sum + t.quantityOnHand * t.costCents,
    0,
  );
  const lowStockCount = tires.filter(
    (t) => t.reorderPoint > 0 && t.quantityOnHand <= t.reorderPoint,
  ).length;

  return { totalSkus, totalUnits, totalValueCents, lowStockCount };
}

export async function getTireStock(
  shopId: string,
  id: string,
): Promise<TireStockDetail | null> {
  const tire = await prisma.tireStock.findFirst({
    where: { id, shopId, active: true },
    include: {
      adjustments: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!tire) return null;

  let runningQty = tire.quantityOnHand;
  const adjustments: TireStockAdjustmentRow[] = tire.adjustments.map((a) => {
    const row: TireStockAdjustmentRow = {
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
    id: tire.id,
    stockNumber: tire.stockNumber,
    brand: tire.brand,
    model: tire.model,
    size: tire.size,
    loadSpeed: tire.loadSpeed,
    condition: tire.condition,
    quantityOnHand: tire.quantityOnHand,
    reorderPoint: tire.reorderPoint,
    reorderQty: tire.reorderQty,
    costCents: tire.costCents,
    retailCents: tire.retailCents,
    binLocation: tire.binLocation,
    dotCode: tire.dotCode,
    treadDepth32nds: tire.treadDepth32nds,
    notes: tire.notes,
    active: tire.active,
    createdAt: tire.createdAt,
    updatedAt: tire.updatedAt,
    adjustments,
  };
}

export async function countTiresLowStock(shopId: string): Promise<number> {
  try {
    const tires = await prisma.tireStock.findMany({
      where: { shopId, active: true, reorderPoint: { gt: 0 } },
      select: { quantityOnHand: true, reorderPoint: true },
    });
    return tires.filter((t) => t.quantityOnHand <= t.reorderPoint).length;
  } catch (err) {
    console.error("[tire-stock] countTiresLowStock failed", shopId, err);
    return 0;
  }
}
