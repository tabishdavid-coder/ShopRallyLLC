import "server-only";

import { prisma } from "@/db/client";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";

const rowSelect = {
  id: true,
  name: true,
  description: true,
  rateCents: true,
  defaultHours: true,
  costCents: true,
  taxable: true,
  isActive: true,
  sortOrder: true,
  updatedAt: true,
} as const;

function toRow(row: {
  id: string;
  name: string;
  description: string | null;
  rateCents: number;
  defaultHours: number;
  costCents: number;
  taxable: boolean;
  isActive: boolean;
  sortOrder: number;
  updatedAt: Date;
}): ShopLaborItemRow {
  return row;
}

/** All shop labor items for settings / manage dialog (includes inactive). */
export async function listShopLaborItemsForManage(shopId: string): Promise<ShopLaborItemRow[]> {
  const rows = await prisma.shopLaborItem.findMany({
    where: { shopId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: rowSelect,
  });
  return rows.map(toRow);
}

/** Active items for canned job / estimate pickers. */
export async function listShopLaborItemsForPicker(
  shopId: string,
  opts?: { q?: string },
): Promise<ShopLaborItemRow[]> {
  const q = opts?.q?.trim();
  const rows = await prisma.shopLaborItem.findMany({
    where: {
      shopId,
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: rowSelect,
  });
  return rows.map(toRow);
}
