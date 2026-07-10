import "server-only";

import { prisma } from "@/db/client";
import {
  isLicensedMotorCatalog,
  motorCatalogDataAvailable,
  type LaborCatalogMode,
} from "@/lib/labor-catalog-mode";
import { shopHasFeature } from "@/lib/plans";

/**
 * Per-shop MOTOR labor entitlement seam (lightweight — see
 * agents/ShopRallyCRM/PLAN-TIER-LABOR-MOTOR.md for the full design).
 *
 * The effective gate is two layers:
 *   Layer 1 — platform:  MOTOR data available (license OR sandbox overlay)
 *   Layer 2 — shop plan:  shopHasFeature(shop, 'motorLabor')  (Pro / Elite)
 *
 * NOTE: this is intentionally NOT yet wired into `lookupLaborSuggestion` /
 * `labor-book-motor.ts`. During the MOTOR pivot we serve MOTOR to any shop when the
 * platform env is on so the demo shop can be tested without Stripe billing. Flip
 * `LABOR_MOTOR_PER_SHOP_GATE=1` (future) to enforce Layer 2 in the resolver.
 */

/** True when Layer-1 platform env allows MOTOR data (licensed OR sandbox). */
export function platformMotorAvailable(): boolean {
  return motorCatalogDataAvailable();
}

/** Layer-2 shop plan check only — does this shop's plan include MOTOR labor? */
export async function shopPlanHasMotorLabor(shopId: string): Promise<boolean> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { plan: true, planFeatures: true },
  });
  if (!shop) return false;
  return shopHasFeature(shop, "motorLabor");
}

/** Two-layer effective gate: platform MOTOR data AND shop plan entitlement. */
export async function motorEnabledForShop(shopId: string): Promise<boolean> {
  if (!platformMotorAvailable()) return false;
  return shopPlanHasMotorLabor(shopId);
}

/** Per-shop catalog mode = licensed only when platform-licensed AND plan-entitled. */
export async function laborCatalogModeForShop(shopId: string): Promise<LaborCatalogMode> {
  if (isLicensedMotorCatalog() && (await shopPlanHasMotorLabor(shopId))) {
    return "licensed";
  }
  return "reference";
}
