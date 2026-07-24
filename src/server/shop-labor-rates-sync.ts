import "server-only";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";

/** Revalidate every surface that reads the unified shop labor list. */
export function revalidateShopLaborSurfaces() {
  revalidatePath("/settings/ro-settings");
  revalidatePath("/canned-jobs");
  revalidatePath("/repair-orders", "layout");
  revalidatePath("/repair-orders/new");
  revalidatePath("/job-board");
}

type Tx = Pick<typeof prisma, "shopLaborItem" | "shop">;

/** Keep Shop.laborRateCents aligned with the row marked isDefault. */
export async function syncShopDefaultLaborRateCents(
  shopId: string,
  tx: Tx = prisma,
): Promise<number | null> {
  const defaultRow = await tx.shopLaborItem.findFirst({
    where: { shopId, isDefault: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { rateCents: true },
  });

  if (!defaultRow) return null;

  await tx.shop.update({
    where: { id: shopId },
    data: { laborRateCents: defaultRow.rateCents },
  });

  return defaultRow.rateCents;
}

/** Clear isDefault on all rows, then mark one id. */
export async function setShopLaborDefault(
  shopId: string,
  defaultId: string,
  tx: Tx = prisma,
) {
  await tx.shopLaborItem.updateMany({
    where: { shopId, isDefault: true },
    data: { isDefault: false },
  });
  await tx.shopLaborItem.updateMany({
    where: { id: defaultId, shopId },
    data: { isDefault: true },
  });
}
