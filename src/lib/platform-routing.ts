/** Master CRM (operator) vs Shop CRM (tenant) route constants. */

import { MACUTO_ESTIMATE_RO_ID, MACUTO_SHOP_ID } from "@/lib/shop-constants";

export const MASTER_CRM_HOME = "/platform";
/** Redirect stub — `src/app/(app)/dashboard/page.tsx` sends users to the snapshot. */
export const SHOP_CRM_HOME = "/dashboard";
/** Real Shop CRM landing page (daily snapshot). Prefer this over `/dashboard`. */
export const SHOP_CRM_LANDING = "/dashboard/snapshot";

/** Default post-auth landing by role (wire in middleware / Clerk after merge). */
export function defaultAppHome(isPlatformAdmin: boolean): string {
  return isPlatformAdmin ? MASTER_CRM_HOME : SHOP_CRM_HOME;
}

/** Home redirect target — preserves dashboard range query for shop users only. */
export function appHomePath(
  isPlatformAdmin: boolean,
  range?: string | null,
): string {
  const base = defaultAppHome(isPlatformAdmin);
  if (base !== SHOP_CRM_HOME || !range) return base;
  return `${SHOP_CRM_HOME}?range=${encodeURIComponent(range)}`;
}

/** Normalize enter/`next` targets so `/dashboard` lands on the real snapshot page. */
function resolveShopCrmDest(path: string): string {
  if (path === "/dashboard" || path.startsWith("/dashboard?")) {
    return SHOP_CRM_LANDING;
  }
  return path;
}

/** Deep link: set active shop cookie via `/platform/enter`, then land on `next`. */
export function platformEnterPath(shopId: string, next?: string): string {
  const params = new URLSearchParams({ shop: shopId });
  if (next?.startsWith("/")) params.set("next", resolveShopCrmDest(next));
  return `/platform/enter?${params.toString()}`;
}

/** Macuto Core fidelity — switches to shop_macuto then opens estimate RO #1001. */
export function macutoEstimateEnterPath(): string {
  return platformEnterPath(
    MACUTO_SHOP_ID,
    `/repair-orders/${MACUTO_ESTIMATE_RO_ID}/estimate`,
  );
}

/** Server redirect target after switching active shop from Master CRM. */
export function enterShopCrmPath(_shopId?: string, next?: string): string {
  if (next?.startsWith("/")) return resolveShopCrmDest(next);
  return SHOP_CRM_LANDING;
}
