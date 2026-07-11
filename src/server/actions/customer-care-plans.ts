"use server";

import { getShopId } from "@/lib/shop";
import type { EstimateContextDrawerCarePlan } from "@/lib/estimate-context-drawer-types";
import { canUseReleasedFeature } from "@/lib/subscription";
import { requireAnyPermission } from "@/server/permissions";
import { getShopPlansShareContext } from "@/server/actions/maintenance-subscriptions";
import { listCustomerCarePlanRows } from "@/server/maintenance-subscriptions";

export async function fetchCustomerCarePlans(
  customerId: string,
): Promise<
  | {
      ok: true;
      plans: EstimateContextDrawerCarePlan[];
      plansUrl: string | null;
      shopName: string | null;
      canAccess: boolean;
    }
  | { ok: false; error: string }
> {
  try {
    const shopId = await getShopId();
    const perm = await requireAnyPermission(shopId, ["customers.view"]);
    if (!perm.ok) return perm;

    const canAccess = await canUseReleasedFeature(shopId, "maintenance_programs");
    const [plans, shareCtx] = await Promise.all([
      canAccess ? listCustomerCarePlanRows(shopId, customerId) : Promise.resolve([]),
      canAccess ? getShopPlansShareContext() : Promise.resolve(null),
    ]);

    return {
      ok: true,
      plans,
      plansUrl: shareCtx?.plansUrl ?? null,
      shopName: shareCtx?.shopName ?? null,
      canAccess,
    };
  } catch (err) {
    console.error("[fetchCustomerCarePlans]", err);
    return { ok: false, error: "Could not load care plan memberships. Try again." };
  }
}
