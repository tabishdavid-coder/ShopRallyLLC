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
  "partsTech",
  "shopSite",
  "websiteSeo",
  "aiSuite",
  "wiringDiagrams",
] as const;

export type ReleaseModule = (typeof RELEASE_MODULES)[number];

export type ReleaseFlagMap = Partial<Record<ReleaseModule, boolean>>;

/** Reserved key inside Shop.planFeatures JSON. */
export const PLAN_FEATURES_RELEASE_KEY = "_release" as const;

const KILL_ENV: Record<ReleaseModule, string> = {
  growthEngine: "RELEASE_KILL_GROWTH_ENGINE",
  sms: "RELEASE_KILL_SMS",
  motorLabor: "RELEASE_KILL_MOTOR_LABOR",
  partsTech: "RELEASE_KILL_PARTS_TECH",
  shopSite: "RELEASE_KILL_SHOP_SITE",
  websiteSeo: "RELEASE_KILL_WEBSITE_SEO",
  aiSuite: "RELEASE_KILL_AI_SUITE",
  wiringDiagrams: "RELEASE_KILL_WIRING_DIAGRAMS",
};

/**
 * Human labels for release toggles. Keep `motorLabor` as the release key (Jul 2026 OEM pivot) —
 * do not add a separate `oemLabor` flag; Pro/Elite shops need one toggle for premium labor
 * (OEM-primary guide + MOTOR fallback). Renaming the key would orphan existing `_release` JSON.
 */
export const RELEASE_MODULE_LABELS: Record<ReleaseModule, string> = {
  growthEngine: "Growth Engine",
  sms: "Two-way SMS",
  motorLabor: "Tabish Friday Labor (Pro/Elite)",
  partsTech: "PartsTech",
  shopSite: "ShopSite",
  websiteSeo: "Growth Engine SEO",
  aiSuite: "AI suite",
  wiringDiagrams: "Wiring diagrams",
};

/** Helper text under each release toggle on Platform → shop detail. */
export const RELEASE_MODULE_DESCRIPTIONS: Record<ReleaseModule, string> = {
  growthEngine: "Marketing campaigns, automations, and review-request flows.",
  sms: "Two-way texting and share-via-SMS on estimates and invoices.",
  motorLabor:
    "Pro/Elite Tabish Friday Labor — EWT browser, fluids, combined jobs. Starter uses shop labor library.",
  partsTech: "Vendor parts catalog lookup and ordering from the estimate.",
  shopSite: "Hosted customer microsite and website editor.",
  websiteSeo: "Local SEO runs, GSC, and on-page SEO automation.",
  aiSuite: "AI intake, review drafts, campaign copy, and receptionist tools.",
  wiringDiagrams: "Interactive wiring diagrams in the estimate workspace.",
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
