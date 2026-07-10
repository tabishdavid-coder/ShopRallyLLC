/**
 * Labor catalog operating mode — licensed MOTOR DaaS vs reference taxonomy + AI.
 * Client-safe (env reads only; no server-only imports).
 */

export type LaborCatalogMode = "reference" | "licensed";

export const LABOR_CATALOG_MODE_ENV = "LABOR_CATALOG_MODE";

/** Opt-in: re-enable reading sandbox-synced MotorCatalogApplication rows in reference/dev. */
export const MOTOR_SANDBOX_CACHE_ENV = "MOTOR_SANDBOX_CACHE";

/** Toggle the AI first-principles / AI-DRAFT labor generation path. */
export const LABOR_AI_ENABLED_ENV = "LABOR_AI_ENABLED";

function hasMotorApiKeys(): boolean {
  const pub = process.env.MOTOR_PUBLIC_KEY?.trim();
  const priv =
    process.env.MOTOR_PRIVATE_KEY?.trim() || process.env.MOTOR_API_KEY?.trim();
  return Boolean(pub && priv);
}

/** Resolved catalog mode for this process. Default: reference (no license required). */
export function getLaborCatalogMode(): LaborCatalogMode {
  const explicit = process.env.LABOR_CATALOG_MODE?.trim().toLowerCase();
  if (explicit === "licensed") return "licensed";
  if (explicit === "reference") return "reference";

  if (
    process.env.MOTOR_LICENSED === "true" &&
    hasMotorApiKeys() &&
    process.env.MOTOR_ENABLED !== "false"
  ) {
    return "licensed";
  }

  return "reference";
}

/** True when LABOR_CATALOG_MODE=licensed and MOTOR API keys are configured. */
export function isLicensedMotorCatalog(): boolean {
  if (getLaborCatalogMode() !== "licensed") return false;
  if (process.env.MOTOR_ENABLED === "false") return false;
  return hasMotorApiKeys();
}

/** Production default path — static taxonomy scaffold + LaborOperation cache + AI. */
export function isReferenceTaxonomyMode(): boolean {
  return !isLicensedMotorCatalog();
}

/**
 * Opt-in only: read sandbox-synced MotorCatalogApplication / motor_ewt rows
 * while in reference mode. Default OFF so Labor Book builds on shop cache + AI.
 * Re-enable later with MOTOR_SANDBOX_CACHE=true (dev) when reconnecting MOTOR.
 */
export function allowSandboxMotorDbCache(): boolean {
  if (!isReferenceTaxonomyMode()) return false;
  if (process.env.MOTOR_ENABLED === "false") return false;
  const flag = process.env.MOTOR_SANDBOX_CACHE?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

/**
 * True when any MOTOR catalog data (licensed OR sandbox overlay) may be served.
 * This is the single "MOTOR is the primary labor source" gate for the Labor Book.
 */
export function motorCatalogDataAvailable(): boolean {
  return isLicensedMotorCatalog() || allowSandboxMotorDbCache();
}

/**
 * AI first-principles / AI-DRAFT labor generation. **Parked by default** (2026-07-09
 * pivot to MOTOR). Enable per-env with LABOR_AI_ENABLED=true only when you want the
 * AI estimate path back as a gap-filler. Server-side env read — thread the resolved
 * value to client components (never exposed as NEXT_PUBLIC).
 */
export function isLaborAiEnabled(): boolean {
  const flag = process.env.LABOR_AI_ENABLED?.trim().toLowerCase();
  return flag === "true" || flag === "1";
}

export type LaborCatalogDisplayLabels = {
  browseTitle: string;
  browseSubtitle: string;
  sourceBadge: string;
  emptySubGroupMessage: string;
  estimateButtonLabel: string;
};

/** UI copy — reference mode avoids "MOTOR catalog" branding when unlicensed. */
export function laborCatalogDisplayLabels(mode: LaborCatalogMode): LaborCatalogDisplayLabels {
  if (mode === "licensed") {
    return {
      browseTitle: "MOTOR Catalog",
      browseSubtitle: "Browse MOTOR taxonomy by system, group, and component",
      sourceBadge: "MOTOR catalog",
      emptySubGroupMessage: "No MOTOR applications synced for this component.",
      estimateButtonLabel: "Estimate with AI",
    };
  }
  return {
    browseTitle: "Shop labor guide",
    browseSubtitle: "Browse repair categories — hours from shop cache or AI estimates",
    sourceBadge: "Shop cache · AI hours",
    emptySubGroupMessage: "No cached jobs for this component — estimate with AI.",
    estimateButtonLabel: "Estimate with AI",
  };
}
