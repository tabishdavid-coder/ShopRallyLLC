import "server-only";

import {
  isLicensedMotorCatalog,
  motorCatalogDataAvailable,
  type LaborCatalogMode,
} from "@/lib/labor-catalog-mode";
import { canUseReleasedFeature } from "@/lib/subscription";

/**
 * Per-shop MOTOR labor entitlement (plan + release flag).
 * See docs/PHASED-ROLLOUT.md and agents/ShopRallyCRM/PLAN-TIER-LABOR-MOTOR.md.
 *
 * Layer 1 — platform: MOTOR data available (license OR sandbox overlay)
 * Layer 2 — shop: canUseReleasedFeature(shopId, "motorLabor")
 */

/** True when Layer-1 platform env allows MOTOR data (licensed OR sandbox). */
export function platformMotorAvailable(): boolean {
  return motorCatalogDataAvailable();
}

/** Layer-2: plan entitlement AND phased release for MOTOR labor. */
export async function shopPlanHasMotorLabor(shopId: string): Promise<boolean> {
  return canUseReleasedFeature(shopId, "motorLabor");
}

/** Two-layer effective gate: platform MOTOR data AND shop plan + release. */
export async function motorEnabledForShop(shopId: string): Promise<boolean> {
  if (!platformMotorAvailable()) return false;
  return shopPlanHasMotorLabor(shopId);
}

/** Per-shop catalog mode = licensed only when platform-licensed AND plan+release entitled. */
export async function laborCatalogModeForShop(shopId: string): Promise<LaborCatalogMode> {
  if (isLicensedMotorCatalog() && (await shopPlanHasMotorLabor(shopId))) {
    return "licensed";
  }
  return "reference";
}
