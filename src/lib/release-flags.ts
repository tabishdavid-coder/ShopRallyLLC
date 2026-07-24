/**
 * Per-shop release flags — deploy ≠ release.
 *
 * Stored under Shop.planFeatures._release so plan boolean overrides stay clean.
 * See docs/PHASED-ROLLOUT.md.
 */

export const RELEASE_MODULES = [
  "growthEngine",
  "sms",
  "motorLabor",
  "tabishFridayLabor",
  "partsTech",
  "shopSite",
  "websiteSeo",
  "aiSuite",
] as const;

export type ReleaseModule = (typeof RELEASE_MODULES)[number];

export type ReleaseFlagMap = Partial<Record<ReleaseModule, boolean>>;

/** Reserved key inside Shop.planFeatures JSON. */
export const PLAN_FEATURES_RELEASE_KEY = "_release" as const;

const KILL_ENV: Record<ReleaseModule, string> = {
  growthEngine: "RELEASE_KILL_GROWTH_ENGINE",
  sms: "RELEASE_KILL_SMS",
  motorLabor: "RELEASE_KILL_MOTOR_LABOR",
  tabishFridayLabor: "RELEASE_KILL_TABISH_FRIDAY_LABOR",
  partsTech: "RELEASE_KILL_PARTS_TECH",
  shopSite: "RELEASE_KILL_SHOP_SITE",
  websiteSeo: "RELEASE_KILL_WEBSITE_SEO",
  aiSuite: "RELEASE_KILL_AI_SUITE",
};

export const RELEASE_MODULE_LABELS: Record<ReleaseModule, string> = {
  growthEngine: "Growth Engine",
  sms: "Two-way SMS",
  motorLabor: "MOTOR labor data",
  tabishFridayLabor: "Tabish Friday Labor",
  partsTech: "PartsTech",
  shopSite: "ShopSite",
  websiteSeo: "Growth Engine SEO",
  aiSuite: "AI suite",
};

export function isReleaseModule(value: string): value is ReleaseModule {
  return (RELEASE_MODULES as readonly string[]).includes(value);
}

/** Strip `_release` (and non-boolean junk) before merging into PlanFeatureSet. */
export function stripReleaseFromPlanFeatures(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key === PLAN_FEATURES_RELEASE_KEY) continue;
    if (typeof value === "boolean" || value === null || typeof value === "number") {
      out[key] = value;
    }
  }
  return out;
}

export function parseReleaseFlags(planFeatures: unknown): ReleaseFlagMap {
  if (!planFeatures || typeof planFeatures !== "object" || Array.isArray(planFeatures)) {
    return {};
  }
  const nested = (planFeatures as Record<string, unknown>)[PLAN_FEATURES_RELEASE_KEY];
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return {};
  const out: ReleaseFlagMap = {};
  for (const key of RELEASE_MODULES) {
    const v = (nested as Record<string, unknown>)[key];
    if (typeof v === "boolean") out[key] = v;
  }
  return out;
}

/** Merge release flag updates into existing planFeatures JSON (preserves plan overrides). */
export function mergeReleaseFlagsIntoPlanFeatures(
  planFeatures: unknown,
  patch: ReleaseFlagMap,
): Record<string, unknown> {
  const base =
    planFeatures && typeof planFeatures === "object" && !Array.isArray(planFeatures)
      ? { ...(planFeatures as Record<string, unknown>) }
      : {};
  const current = parseReleaseFlags(base);
  const next: ReleaseFlagMap = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (!isReleaseModule(key) || typeof value !== "boolean") continue;
    next[key] = value;
  }
  base[PLAN_FEATURES_RELEASE_KEY] = next;
  return base;
}

/** Global kill switch for a module (env). */
export function isReleaseKilled(module: ReleaseModule): boolean {
  const envName = KILL_ENV[module];
  const raw = process.env[envName]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * When true, entitled shops get modules without a per-shop flip (local/preview).
 * Production defaults to closed unless RELEASE_FLAGS_OPEN=true.
 */
export function releaseFlagsDefaultOpen(): boolean {
  const forced = process.env.RELEASE_FLAGS_OPEN?.trim().toLowerCase();
  if (forced === "true" || forced === "1" || forced === "yes") return true;
  if (forced === "false" || forced === "0" || forced === "no") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV !== "production";
}

/**
 * Pure release check (no plan entitlement).
 * Explicit shop false always wins; explicit true wins; else defaultOpen.
 */
export function isModuleReleased(planFeatures: unknown, module: ReleaseModule): boolean {
  if (isReleaseKilled(module)) return false;
  const flags = parseReleaseFlags(planFeatures);
  if (flags[module] === false) return false;
  if (flags[module] === true) return true;
  return releaseFlagsDefaultOpen();
}
