import type { PlanFeature } from "@/lib/plans";
import { resolvePlanFeatures, type PlanFeatureSet } from "@/lib/plans";
import { stripReleaseFromPlanFeatures } from "@/lib/release-flags";
import type { ShopPlan } from "@/generated/prisma";

/** Plan features platform admins may toggle per shop (add-ons). */
export const TOGGLEABLE_PLAN_FEATURES = new Set<PlanFeature>(["freeformRoIntake"]);

export function mergePlanFeatureOverride(
  planFeatures: unknown,
  feature: PlanFeature,
  enabled: boolean,
): Record<string, unknown> {
  const base =
    planFeatures && typeof planFeatures === "object" && !Array.isArray(planFeatures)
      ? { ...(planFeatures as Record<string, unknown>) }
      : {};
  return { ...base, [feature]: enabled };
}

export function resolvedPlanFeaturesForPlatform(
  plan: ShopPlan,
  planFeatures: unknown,
): PlanFeatureSet {
  return resolvePlanFeatures({ plan, planFeatures });
}

/** Strip release block and return boolean overrides only. */
export function planFeatureOverridesOnly(
  planFeatures: unknown,
): Partial<Record<PlanFeature, boolean>> {
  const stripped = stripReleaseFromPlanFeatures(planFeatures);
  if (!stripped) return {};
  const out: Partial<Record<PlanFeature, boolean>> = {};
  for (const [key, value] of Object.entries(stripped)) {
    if (typeof value === "boolean") {
      out[key as PlanFeature] = value;
    }
  }
  return out;
}
