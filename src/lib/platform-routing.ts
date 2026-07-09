/** Master CRM (operator) vs Shop CRM (tenant) route constants. */

export const MASTER_CRM_HOME = "/platform";
export const SHOP_CRM_HOME = "/dashboard";

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

/** Server redirect target after switching active shop from Master CRM. */
export function enterShopCrmPath(_shopId?: string): string {
  return SHOP_CRM_HOME;
}
