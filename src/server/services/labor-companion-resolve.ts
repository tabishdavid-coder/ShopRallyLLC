import "server-only";

import {
  matchCompanionEdges,
  type LaborCompanionEdge,
  type PrimaryLaborContext,
  type ResolvedLaborCompanion,
} from "@/lib/labor-companion-graph";
import { sourceBadgeLabel } from "@/lib/labor-guide-helpers";
import type { LaborGuideHit } from "@/lib/labor-guide-types";
import {
  companionHoursFromCombinedJob,
  expandOperationVariants,
} from "@/lib/labor-guide-variants";
import { searchCachedLaborOperations } from "@/server/labor-guide-cache";
import type { Vehicle } from "@/server/services/labor-guide";

function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

function textForHit(hit: LaborGuideHit): string {
  return [hit.jobName, hit.queryText ?? "", ...hit.laborOperations].join(" ").toLowerCase();
}

function isCombinedCacheHit(edge: LaborCompanionEdge, hit: LaborGuideHit): boolean {
  const text = textForHit(hit);
  switch (edge.comboRuleId) {
    case "pads_rotors":
      return /\bpads?\b/i.test(text) && /\brotors?\b/i.test(text);
    case "wheel_bearing_hub":
      return /\bbearing\b/i.test(text) && /\bhub\b/i.test(text);
    case "timing_belt_water_pump":
      return /\btiming\s+belt\b/i.test(text) && /\bwater\s+pump\b/i.test(text);
    case "serpentine_belt_tensioner":
      return /\bbelt\b/i.test(text) && /\btensioner\b/i.test(text);
    default:
      return false;
  }
}

function bestHoursForHit(hit: LaborGuideHit, position?: string | null): number | null {
  const variants = expandOperationVariants(hit, {
    positionFilter: position ? [position] : undefined,
  });
  const withHours = variants.filter((variant) => Number.isFinite(variant.hours));
  if (!withHours.length) return Number.isFinite(hit.totalHours) ? hit.totalHours : null;
  return Math.min(...withHours.map((variant) => variant.hours));
}

async function findCompanionHit(
  vehicle: Vehicle,
  edge: LaborCompanionEdge,
): Promise<LaborGuideHit | null> {
  const seen = new Set<string>();
  for (const query of edge.searchQueries) {
    const hits = await searchCachedLaborOperations(vehicle, query, 8);
    for (const hit of hits) {
      if (seen.has(hit.id)) continue;
      seen.add(hit.id);
      return hit;
    }
  }
  return null;
}

function resolveHours(
  edge: LaborCompanionEdge,
  hit: LaborGuideHit,
  position?: string | null,
): Pick<ResolvedLaborCompanion, "displayHours" | "standaloneHours" | "hoursMode" | "hoursNote"> {
  const standaloneHours = bestHoursForHit(hit, position);
  if (standaloneHours == null) {
    return {
      displayHours: null,
      standaloneHours: null,
      hoursMode: "unresolved",
      hoursNote: "Cached related labor exists, but no usable hours were found.",
    };
  }

  if (edge.comboRuleId && edge.companionScopeId && isCombinedCacheHit(edge, hit)) {
    const split = companionHoursFromCombinedJob(
      hit.totalHours,
      edge.comboRuleId,
      edge.companionScopeId,
    );
    if (split != null) {
      return {
        displayHours: split,
        standaloneHours,
        hoursMode: "concurrent",
        hoursNote: "Estimated from cached combined-job component split.",
      };
    }
  }

  if (edge.concurrentOfStandaloneRatio < 1) {
    return {
      displayHours: roundHours(standaloneHours * edge.concurrentOfStandaloneRatio),
      standaloneHours,
      hoursMode: "concurrent",
      hoursNote: `${Math.round(edge.concurrentOfStandaloneRatio * 100)}% of standalone labor when performed with the primary job.`,
    };
  }

  return {
    displayHours: roundHours(standaloneHours),
    standaloneHours,
    hoursMode: "standalone",
    hoursNote: "Standalone related labor commonly sold with this job.",
  };
}

export async function resolveLaborCompanions(
  vehicle: Vehicle,
  primary: PrimaryLaborContext,
): Promise<ResolvedLaborCompanion[]> {
  const edges = matchCompanionEdges(primary);
  const resolved: ResolvedLaborCompanion[] = [];

  for (const edge of edges) {
    const hit = await findCompanionHit(vehicle, edge);
    if (!hit) {
      resolved.push({
        edgeId: edge.id,
        jobName: edge.jobName,
        description: edge.description,
        displayHours: null,
        standaloneHours: null,
        hoursMode: "unresolved",
        hoursNote: "No related labor is cached yet for this vehicle.",
        sourceBadge: "Not cached",
        hitSource: "cached",
        position: primary.position ?? null,
      });
      continue;
    }

    resolved.push({
      edgeId: edge.id,
      jobName: hit.jobName || edge.jobName,
      description: edge.description,
      ...resolveHours(edge, hit, primary.position),
      sourceBadge: sourceBadgeLabel(hit.source, hit.dataSource),
      hitSource: hit.source,
      dataSource: hit.dataSource,
      position: primary.position ?? null,
    });
  }

  return resolved;
}
