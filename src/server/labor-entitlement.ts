import "server-only";

import {
  isLicensedMotorCatalog,
  motorCatalogDataAvailable,
  type LaborCatalogMode,
} from "@/lib/labor-catalog-mode";
import { canUseReleasedFeature } from "@/lib/subscription";

/**
 * Per-shop premium labor entitlement (plan + release flag).
 * See docs/PHASED-ROLLOUT.md and agents/ShopRallyCRM/PLAN-TIER-LABOR-MOTOR.md.
 *
 * **Release key:** `motorLabor` (unchanged) — gates Pro/Elite premium labor for both:
 *   1. **OEM automation labor** (primary lookup path, Jul 2026)
 *   2. **MOTOR catalog** (fallback after OEM misses)
 *
 * Starter/Core keeps shop-history + reference taxonomy only — no OEM primary, no MOTOR BOOK.
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

/**
 * Pro/Elite shops with released `motorLabor` use OEM automation as the **primary** labor lookup
 * (SQL averages + optional FastAPI). MOTOR/AI remain fallbacks — never forced on STARTER.
 */
export async function oemLaborPrimaryForShop(shopId: string): Promise<boolean> {
  return canUseReleasedFeature(shopId, "motorLabor");
}
