"use server";

import { getShopId } from "@/lib/shop";
import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";
import { requireAnyPermission } from "@/server/permissions";
import { loadEstimateContextDrawerData } from "@/server/estimate-context-drawer";

export type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";

export async function fetchEstimateContextDrawer(
  customerId: string,
): Promise<{ ok: true; data: EstimateContextDrawerData } | { ok: false; error: string }> {
  try {
    const shopId = await getShopId();
    const perm = await requireAnyPermission(shopId, [
      "customers.view",
      "estimate.view",
      "estimate.edit",
    ]);
    if (!perm.ok) return perm;

    const data = await loadEstimateContextDrawerData(shopId, customerId);
    if (!data) return { ok: false, error: "Customer not found." };

    return { ok: true, data };
  } catch (err) {
    console.error("[fetchEstimateContextDrawer]", err);
    return { ok: false, error: "Could not load customer profile. Try again." };
  }
}
