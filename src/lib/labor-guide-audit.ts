import {
  assemblyDefaultHours,
  matchAssemblyRule,
  type AssemblyRule,
} from "@/lib/labor-guide-assembly-rules";
import type { LaborSuggestion } from "@/server/services/labor-guide";

export type LaborAuditContext = {
  request: string;
  subcategoryId?: string;
};

export type LaborAuditResult = {
  suggestion: LaborSuggestion;
  warnings: string[];
  normalized: boolean;
  ruleId?: string;
};

function textIncludesFragment(text: string, fragment: string): boolean {
  return text.toLowerCase().includes(fragment.toLowerCase());
}

function consolidateOperations(
  suggestion: LaborSuggestion,
  rule: AssemblyRule,
  warnings: string[],
): LaborSuggestion {
  const ops = suggestion.laborOperations.filter(Boolean);
  const totalHours =
    suggestion.unitLabel.toLowerCase() === "vehicle"
      ? suggestion.laborHoursPerUnit
      : suggestion.laborHoursPerUnit * suggestion.unitsOnVehicle;

  if (ops.length <= rule.maxLaborOperations) {
    return suggestion;
  }

  warnings.push(
    `Consolidated ${ops.length} labor lines into canonical "${rule.canonicalName}" — verify hours.`,
  );

  return {
    ...suggestion,
    jobName: rule.canonicalName,
    unitLabel: rule.expectedUnitLabel,
    unitsOnVehicle: rule.expectedUnitsOnVehicle,
    laborHoursPerUnit:
      rule.expectedUnitLabel.toLowerCase() === "vehicle"
        ? totalHours
        : totalHours / Math.max(rule.expectedUnitsOnVehicle, 1),
    laborOperations: [rule.canonicalName],
    confidenceScore: Math.min(suggestion.confidenceScore, 0.55),
  };
}

/**
 * Non-blocking audit + normalize for labor suggestions.
 * Never returns null — always passes through a usable suggestion.
 */
export function auditAndNormalizeLaborSuggestion(
  suggestion: LaborSuggestion,
  context: LaborAuditContext,
): LaborAuditResult {
  const warnings: string[] = [];
  let current = { ...suggestion };
  let normalized = false;

  const rule = matchAssemblyRule(context.request, current.jobName, context.subcategoryId);
  if (!rule) {
    if (current.confidenceScore < 0.5) {
      warnings.push("Low confidence estimate — verify hours before quoting.");
    }
    return { suggestion: current, warnings, normalized };
  }

  const opText = current.laborOperations.join(" ");
  const combined = `${current.jobName} ${opText}`;

  for (const fragment of rule.forbiddenFragments ?? []) {
    if (textIncludesFragment(combined, fragment)) {
      warnings.push(`Possible sub-component quote ("${fragment}") — expected full assembly.`);
    }
  }

  if (current.laborOperations.length > rule.maxLaborOperations) {
    current = consolidateOperations(current, rule, warnings);
    normalized = true;
  }

  if (
    rule.expectedUnitsOnVehicle === 1 &&
    (current.unitsOnVehicle !== 1 ||
      current.unitLabel.toLowerCase() !== rule.expectedUnitLabel.toLowerCase())
  ) {
    const hoursPerUnit =
      current.laborHoursPerUnit > 0
        ? current.laborHoursPerUnit
        : current.unitsOnVehicle > 1
          ? current.laborHoursPerUnit
          : current.laborHoursPerUnit;
    current = {
      ...current,
      jobName: rule.canonicalName,
      unitLabel: rule.expectedUnitLabel,
      unitsOnVehicle: 1,
      laborHoursPerUnit: hoursPerUnit,
      laborOperations:
        current.laborOperations.length > rule.maxLaborOperations
          ? [rule.canonicalName]
          : current.laborOperations,
    };
    warnings.push(`Corrected to single ${rule.canonicalName} assembly (not multi-unit).`);
    normalized = true;
  }

  if (normalizeText(current.jobName) !== normalizeText(rule.canonicalName)) {
    const canonicalMismatch = !rule.matchTerms.some((t) =>
      normalizeText(current.jobName).includes(normalizeText(t)),
    );
    if (canonicalMismatch) {
      current = { ...current, jobName: rule.canonicalName };
      warnings.push(`Renamed to canonical job "${rule.canonicalName}".`);
      normalized = true;
    }
  }

  if (
    current.unitLabel.toLowerCase() !== rule.expectedUnitLabel.toLowerCase() &&
    rule.expectedUnitLabel !== "vehicle"
  ) {
    warnings.push(
      `Expected unit "${rule.expectedUnitLabel}" for this assembly — got "${current.unitLabel}".`,
    );
  }

  if (current.confidenceScore < 0.6) {
    warnings.push("Low confidence estimate — verify hours before quoting.");
  }

  return { suggestion: current, warnings, normalized, ruleId: rule.id };
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Fallback template when AI and cache miss — always returns a suggestion. */
export function assemblyFallbackSuggestion(request: string, subcategoryId?: string): LaborAuditResult {
  const rule = matchAssemblyRule(request, undefined, subcategoryId);
  if (!rule) {
    const generic: LaborSuggestion = {
      jobName: request.trim() || "General repair",
      unitLabel: "vehicle",
      unitsOnVehicle: 1,
      laborHoursPerUnit: 1.0,
      laborOperations: [request.trim() || "Labor"],
      notes: "Baseline placeholder — verify scope and hours for this vehicle.",
      confidenceScore: 0.25,
      reasoningSummary: "Generic fallback when no cache or AI result was available.",
    };
    return {
      suggestion: generic,
      warnings: ["No cached or AI estimate — using placeholder hours. Verify before quoting."],
      normalized: true,
    };
  }

  const hours = assemblyDefaultHours(rule);
  const suggestion: LaborSuggestion = {
    jobName: rule.canonicalName,
    unitLabel: rule.expectedUnitLabel,
    unitsOnVehicle: rule.expectedUnitsOnVehicle,
    laborHoursPerUnit: hours,
    laborOperations: [rule.canonicalName],
    notes: "Assembly template baseline — verify hours for this vehicle configuration.",
    confidenceScore: 0.35,
    reasoningSummary: `Template fallback for ${rule.canonicalName} using internal assembly rules.`,
  };

  return {
    suggestion,
    warnings: [
      `AI unavailable — using internal template (${hours.toFixed(1)} hrs). Verify before quoting.`,
    ],
    normalized: true,
    ruleId: rule.id,
  };
}
