import "server-only";

import { matchOperationsToSubcategory } from "@/lib/labor-categories";
import type { LaborGuideHit } from "@/lib/labor-guide-types";
import { isLicensedMotorCatalog } from "@/lib/labor-catalog-mode";
import type { LaborSuggestion, Vehicle } from "@/server/services/labor-guide";
import {
  fetchMotorLaborGuide,
  findMotorLaborSuggestion,
  motorHitToSuggestion,
} from "@/server/services/motor/motor-labor";

/**
 * Licensed labor catalog facade.
 *
 * MOTOR DaaS lives in `src/server/services/motor/` — delete that folder and set
 * MOTOR_ENABLED=false to remove the integration without touching cache/AI paths.
 *
 * Legacy `LABOR_CATALOG_URL` stub remains for a future generic HTTP catalog adapter.
 */

function normalizeQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isLaborCatalogServiceEnabled(): boolean {
  return isLicensedMotorCatalog() || Boolean(process.env.LABOR_CATALOG_URL?.trim());
}

export async function fetchCatalogLaborGuide(vehicle: Vehicle): Promise<{
  ok: boolean;
  hits: LaborGuideHit[];
}> {
  if (isLicensedMotorCatalog()) {
    try {
      const hits = await fetchMotorLaborGuide(vehicle);
      return { ok: true, hits };
    } catch {
      return { ok: false, hits: [] };
    }
  }
  return { ok: false, hits: [] };
}

export function filterCatalogHits(
  hits: LaborGuideHit[],
  opts: { query?: string; subcategoryId?: string },
): LaborGuideHit[] {
  let filtered = hits;

  if (opts.query?.trim()) {
    const q = normalizeQuery(opts.query);
    filtered = filtered.filter(
      (h) =>
        normalizeQuery(h.jobName).includes(q) ||
        h.laborOperations.some((op) => normalizeQuery(op).includes(q)) ||
        (h.queryText && normalizeQuery(h.queryText).includes(q)),
    );
  }

  if (opts.subcategoryId) {
    filtered = matchOperationsToSubcategory(opts.subcategoryId, filtered);
  }

  return filtered;
}

export async function findCatalogLaborSuggestion(
  vehicle: Vehicle,
  request: string,
): Promise<LaborSuggestion | null> {
  if (isLicensedMotorCatalog()) {
    try {
      return await findMotorLaborSuggestion(vehicle, request);
    } catch {
      return null;
    }
  }
  return null;
}

export function catalogHitToSuggestion(hit: LaborGuideHit): LaborSuggestion | null {
  if (hit.laborHoursPerUnit == null || hit.unitLabel == null || hit.unitsOnVehicle == null) {
    return null;
  }
  const isMotor = hit.id.startsWith("motor:");
  return {
    jobName: hit.jobName,
    unitLabel: hit.unitLabel,
    unitsOnVehicle: hit.unitsOnVehicle,
    laborHoursPerUnit: hit.laborHoursPerUnit,
    laborOperations: hit.laborOperations,
    notes: hit.notes ?? "",
    confidenceScore: hit.confidenceScore ?? (isMotor ? 0.92 : 0.7),
    reasoningSummary: isMotor
      ? "MOTOR Estimated Work Times (licensed catalog)"
      : "Catalog labor operation",
  };
}

/** Re-export for tests / diagnostics without importing motor/* elsewhere. */
export { motorHitToSuggestion };
