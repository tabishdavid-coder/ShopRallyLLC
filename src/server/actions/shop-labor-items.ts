"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { SaveShopLaborItemInput } from "@/lib/shop-labor-item-schemas";
import type { ShopLaborItemRow } from "@/lib/shop-labor-item-types";
import { gates } from "@/server/permission-gates";
import {
  listShopLaborItemsForManage,
  listShopLaborItemsForPicker,
} from "@/server/shop-labor-items";

export type ShopLaborItemResult = { ok: true; id?: string } | { ok: false; error: string };

export type ShopLaborItemsFetchResult =
  | { ok: true; items: ShopLaborItemRow[] }
  | { ok: false; error: string };

function revalidateShopLabor() {
  revalidatePath("/canned-jobs");
}

export async function fetchShopLaborItemsForPicker(q?: string): Promise<ShopLaborItemsFetchResult> {
  try {
    const shopId = await getShopId();
    const items = await listShopLaborItemsForPicker(shopId, { q });
    return { ok: true, items };
  } catch (err) {
    console.error("[fetchShopLaborItemsForPicker]", err);
    return { ok: false, error: "Could not load shop labor items." };
  }
}

export async function fetchShopLaborItemsForManage(): Promise<ShopLaborItemsFetchResult> {
  try {
    const shopId = await getShopId();
    const items = await listShopLaborItemsForManage(shopId);
    return { ok: true, items };
  } catch (err) {
    console.error("[fetchShopLaborItemsForManage]", err);
    return { ok: false, error: "Could not load shop labor items." };
  }
}

export async function saveShopLaborItem(raw: unknown): Promise<ShopLaborItemResult> {
  const parsed = SaveShopLaborItemInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid labor item." };
  }
  const d = parsed.data;
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  if (d.id) {
    const existing = await prisma.shopLaborItem.findFirst({
      where: { id: d.id, shopId },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Labor item not found." };

    await prisma.shopLaborItem.updateMany({
      where: { id: d.id, shopId },
      data: {
        name: d.name,
        description: d.description?.trim() || null,
        rateCents: d.rateCents,
        defaultHours: d.defaultHours,
        costCents: d.costCents,
        taxable: d.taxable,
        isActive: d.isActive,
      },
    });
    revalidateShopLabor();
    return { ok: true, id: d.id };
  }

  const maxSort = await prisma.shopLaborItem.aggregate({
    where: { shopId },
    _max: { sortOrder: true },
  });

  const created = await prisma.shopLaborItem.create({
    data: {
      shopId,
      name: d.name,
      description: d.description?.trim() || null,
      rateCents: d.rateCents,
      defaultHours: d.defaultHours,
      costCents: d.costCents,
      taxable: d.taxable,
      isActive: d.isActive,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
    select: { id: true },
  });
  revalidateShopLabor();
  return { ok: true, id: created.id };
}

export async function deleteShopLaborItem(id: string): Promise<ShopLaborItemResult> {
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const res = await prisma.shopLaborItem.deleteMany({ where: { id, shopId } });
  if (res.count === 0) return { ok: false, error: "Labor item not found." };
  revalidateShopLabor();
  return { ok: true };
}

export async function toggleShopLaborItemActive(id: string, isActive: boolean): Promise<ShopLaborItemResult> {
  const shopId = await getShopId();
  const denied = await gates.cannedJobsManage(shopId);
  if (denied) return { ok: false, error: denied.error };

  const res = await prisma.shopLaborItem.updateMany({
    where: { id, shopId },
    data: { isActive },
  });
  if (res.count === 0) return { ok: false, error: "Labor item not found." };
  revalidateShopLabor();
  return { ok: true };
}
