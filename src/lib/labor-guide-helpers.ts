import { classifyOperation } from "@/lib/labor-categories";
import type {
  LaborCartLine,
  LaborGuideHit,
  LaborGuideSource,
  LaborVariant,
} from "@/lib/labor-guide-types";
import type { LaborSuggestion } from "@/server/services/labor-guide";

/** Strip category breadcrumbs and verbose phrasing for short estimate lines. */
export function compactOperationName(name: string): string {
  const stripped = name.split(/\s*[>›]\s*/).pop()?.trim() ?? name.trim();

  const rnrPrefix = stripped.match(/^remove\s*(?:&|and)\s*replace\s+(.+)/i);
  if (rnrPrefix) return `${rnrPrefix[1].trim()} R&R`;

  const rnrSuffix = stripped.match(/^(.+?)\s+remove\s*(?:&|and)\s*replace/i);
  if (rnrSuffix) return `${rnrSuffix[1].trim()} R&R`;

  if (/\bR&R\b/i.test(stripped)) return stripped;

  if (/\b(strut|shock)\b/i.test(stripped)) return "Strut R&R";

  return stripped;
}

/** Default job card title from a guide hit — operation name, not variant text. */
export function guideJobName(jobName: string): string {
  if (/\b(strut|shock)\b/i.test(jobName)) return "Strut R&R";
  return jobName.split(/\s*[>›]\s*/)[0]?.trim() ?? jobName;
}

/** Short labor line for estimate — scope encoded only when it clarifies (struts/brakes). */
export function shortLaborLineDescription(
  jobName: string,
  variant?: Pick<LaborVariant, "label" | "position" | "scope">,
): string {
  const base = compactOperationName(jobName);
  if (!variant?.position && !variant?.scope) return base;

  const pos = variant.position?.toLowerCase();
  const scope = variant.scope?.toLowerCase();

  if (/\b(strut|shock)\b/i.test(jobName) && pos) {
    if (scope === "both sides") return `${pos} struts, both sides`;
    if (scope === "one side") return `${pos} strut`;
    if (scope === "all" || variant.label === "All Four") return "All four struts";
  }

  if (/\bbrake\b/i.test(jobName) && pos) {
    const posCap = pos.includes("front") && pos.includes("rear") ? "Front & rear" : pos;
    const brakeScope = scope?.toLowerCase();
    if (brakeScope === "pads only") return `${posCap} brake pads`;
    if (brakeScope === "rotors only") return `${posCap} rotors`;
    if (brakeScope === "pads & rotors") return `${posCap} pads & rotors`;
    if (pos.includes("front") && pos.includes("rear")) return "Front & rear brakes";
    return `${posCap} brakes`;
  }

  if (/\bbrake\b/i.test(jobName) && scope) {
    const brakeScope = scope.toLowerCase();
    if (brakeScope === "pads only") return "Brake pads";
    if (brakeScope === "rotors only") return "Rotors";
    if (brakeScope === "pads & rotors") return "Pads & rotors";
  }

  if (scope && !pos) {
    const s = scope.toLowerCase();
    if (s === "belt only" && /\btiming\b/i.test(jobName)) return "Timing belt";
    if (s === "pump only") return "Water pump";
    if (s === "belt & pump") return "Timing belt & water pump";
    if (s === "belt only") return "Serpentine belt";
    if (s === "tensioner only") return "Tensioner";
    if (s === "belt & tensioner") return "Belt & tensioner";
  }

  if (pos && scope) {
    const s = scope.toLowerCase();
    const posCap = pos.includes("front") && pos.includes("rear") ? "Front & rear" : pos;
    if (s === "belt only" && /\btiming\b/i.test(jobName)) return `${posCap} timing belt`;
    if (s === "pump only") return `${posCap} water pump`;
    if (s === "belt & pump") return `${posCap} timing belt & water pump`;
  }

  if (pos && scope) {
    if (scope === "both sides") return `${pos}, both sides`;
    if (scope === "one side") return `${pos}, one side`;
  }

  if (variant.label && variant.label !== jobName) {
    return variant.label.replace(/ · /g, ", ").toLowerCase();
  }

  return base;
}

function hitAsSuggestion(hit: LaborGuideHit): LaborSuggestion | null {
  if (hit.laborHoursPerUnit == null || hit.unitLabel == null || hit.unitsOnVehicle == null) return null;
  return {
    jobName: hit.jobName,
    unitLabel: hit.unitLabel,
    unitsOnVehicle: hit.unitsOnVehicle,
    laborHoursPerUnit: hit.laborHoursPerUnit,
    laborOperations: hit.laborOperations,
    notes: hit.notes ?? "",
    confidenceScore: hit.confidenceScore ?? 0.5,
    reasoningSummary: "",
  };
}

/** Convert a generate result into a LaborGuideHit for the UI (same shape as shop library hits). */
export function suggestionToHit(
  suggestion: LaborSuggestion,
  queryText: string,
  cached: boolean,
  auditWarnings?: string[],
  opts?: { dataSource?: string; categoryPath?: string },
): LaborGuideHit {
  const totalHours =
    suggestion.unitLabel.toLowerCase() === "vehicle"
      ? suggestion.laborHoursPerUnit
      : suggestion.laborHoursPerUnit * suggestion.unitsOnVehicle;
  const skipClassify =
    opts?.dataSource === "motor_ewt" ||
    opts?.dataSource === "ai_motor_scoped" ||
    opts?.dataSource === "ai_taxonomy_scoped";
  const cls = skipClassify ? null : classifyOperation(suggestion.jobName, queryText);
  return {
    id: cached ? `cache-gen:${queryText}` : `ai:${queryText}`,
    jobName: suggestion.jobName,
    queryText,
    totalHours,
    laborHoursPerUnit: suggestion.laborHoursPerUnit,
    unitLabel: suggestion.unitLabel,
    unitsOnVehicle: suggestion.unitsOnVehicle,
    laborOperations: suggestion.laborOperations,
    notes: suggestion.notes,
    categoryId: cls?.categoryId,
    subcategoryId: cls?.subcategoryId,
    categoryPath: cls?.breadcrumb ?? opts?.categoryPath,
    source: cached ? "cached" : "ai_estimate",
    confidenceScore: suggestion.confidenceScore,
    auditWarnings: auditWarnings?.length ? auditWarnings : undefined,
    dataSource: opts?.dataSource,
  };
}

/** Expand a suggestion + qty into cart labor lines. */
export function suggestionToCartLines(
  s: LaborSuggestion,
  qty: number,
  source: LaborGuideHit["source"],
  dataSource?: string,
): LaborCartLine[] {
  const totalHours = s.laborHoursPerUnit * qty;
  const ops = s.laborOperations.length ? s.laborOperations : [s.jobName];
  if (ops.length === 1) {
    return [{ description: compactOperationName(s.jobName), hours: totalHours, source, dataSource }];
  }
  const perOp = totalHours / ops.length;
  return ops.map(() => ({
    description: compactOperationName(s.jobName),
    hours: perOp,
    source,
    dataSource,
  }));
}

/** Expand a search hit into editable cart labor lines. */
export function hitToCartLines(hit: LaborGuideHit, qty = 1): LaborCartLine[] {
  if (hit.cannedJobId) {
    if (hit.laborOperations.length <= 1) {
      return [
        {
          description: compactOperationName(hit.laborOperations[0]?.trim() || hit.jobName),
          hours: hit.totalHours,
          source: hit.source,
          dataSource: hit.dataSource,
        },
      ];
    }
    const perOp = hit.totalHours / hit.laborOperations.length;
    return hit.laborOperations.map((op) => ({
      description: compactOperationName(op.trim() || hit.jobName),
      hours: perOp,
      source: hit.source,
      dataSource: hit.dataSource,
    }));
  }
  const suggestion = hitAsSuggestion(hit);
  if (suggestion) return suggestionToCartLines(suggestion, qty, hit.source, hit.dataSource);
  const perOp = hit.totalHours / Math.max(hit.laborOperations.length, 1);
  return hit.laborOperations.map(() => ({
    description: compactOperationName(hit.jobName),
    hours: perOp,
    source: hit.source,
    dataSource: hit.dataSource,
  }));
}

/**
 * Provenance tiers surfaced to advisors (see LABOR-ESTIMATE-ALGORITHM.md §3.1).
 * The tier is the honesty gate: only BOOK / SHOP are billable without a hours check;
 * AI_DRAFT must always say "verify" so a guess is never mistaken for a book time.
 */
export type LaborTier = "BOOK" | "SHOP" | "CALIBRATED" | "AI_DRAFT";

export type LaborTierMeta = {
  tier: LaborTier;
  /** Short badge text, e.g. "SHOP", "AI-DRAFT · verify". */
  label: string;
  /** Tailwind classes for the badge pill. */
  badgeClass: string;
  /** True when the hours are grounded enough to quote without a manual check. */
  billable: boolean;
  /** True when the UI must always show a "verify hours" affordance. */
  verify: boolean;
};

/**
 * Map a row's provenance (`dataSource`, falling back to `source`) to a tier.
 * This is the single source of truth for labor-hour honesty labels.
 */
export function laborTierFromDataSource(
  dataSource?: string | null,
  source?: LaborGuideSource,
): LaborTierMeta {
  const ds = (dataSource ?? "").toLowerCase();

  // Licensed book time (MOTOR EWT / catalog) — the only "authority" tier today.
  if (ds === "motor_ewt" || ds.startsWith("motor") || ds === "y_mm_catalog" || source === "catalog") {
    return {
      tier: "BOOK",
      label: "BOOK",
      badgeClass: "bg-primary/10 text-primary",
      billable: true,
      verify: false,
    };
  }

  // This shop's own repeated actuals, or shop-defined canned/curated jobs.
  if (
    ds === "shop_history" ||
    ds === "shop_curated" ||
    ds === "canned" ||
    ds === "manual" ||
    source === "shop_custom"
  ) {
    return {
      tier: "SHOP",
      label: "SHOP",
      badgeClass: "bg-emerald-500/10 text-emerald-700",
      billable: true,
      verify: false,
    };
  }

  // AI draft adjusted by an observed ratio (reserved for T2 calibration).
  if (ds === "calibrated") {
    return {
      tier: "CALIBRATED",
      label: "CALIBRATED · verify",
      badgeClass: "bg-amber-500/15 text-amber-800",
      billable: false,
      verify: true,
    };
  }

  // Everything else (ai_first_principles / ai_motor_scoped / ai_taxonomy_scoped /
  // legacy ai_estimate / ungrounded cached) is an honest AI draft — verify required.
  return {
    tier: "AI_DRAFT",
    label: "AI-DRAFT · verify",
    badgeClass: "bg-brand-red/10 text-brand-red",
    billable: false,
    verify: true,
  };
}

export function dataSourceBadgeLabel(dataSource?: string): string | null {
  if (!dataSource) return null;
  return laborTierFromDataSource(dataSource).label;
}

export function sourceBadgeLabel(source: LaborGuideHit["source"], dataSource?: string): string {
  return laborTierFromDataSource(dataSource, source).label;
}

export function sourceBadgeClass(source: LaborGuideHit["source"], dataSource?: string): string {
  return laborTierFromDataSource(dataSource, source).badgeClass;
}
