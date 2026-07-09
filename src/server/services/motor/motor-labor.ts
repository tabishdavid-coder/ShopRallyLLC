import "server-only";

import { isLicensedMotorCatalog } from "@/lib/labor-catalog-mode";
import type { LaborGuideHit } from "@/lib/labor-guide-types";
import type { LaborSuggestion, Vehicle } from "@/server/services/labor-guide";
import { motorGet } from "@/server/services/motor/motor-client";
import { resolveMotorBaseVehicleId } from "@/server/services/motor/motor-vehicle";

type MotorTaxonomy = {
  LiteralName?: string;
  SystemName?: string;
  GroupName?: string;
  SubGroupName?: string;
};

type MotorWorkTimeSummary = {
  BaseLaborTime?: number;
  LaborTimeInterval?: string;
  AllLaborTime?: number;
  AllLaborTimeDescription?: string;
  BaseLaborTimeDescription?: string;
  AdditionalLaborTime?: number;
  AdditionalLaborTimeDescription?: string;
};

type MotorApplicationSummary = {
  ApplicationID?: number;
  DisplayName?: string;
  Taxonomy?: MotorTaxonomy;
  Items?: MotorWorkTimeSummary[] | { EstimatedWorkTimeSummary?: MotorWorkTimeSummary[] };
  Position?: { Name?: string };
  Qualifiers?: { QualifierInfo?: Array<{ Description?: string }> } | Array<{ Description?: string }>;
};

const browseCache = new Map<string, { hits: LaborGuideHit[]; expiresAt: number }>();
const BROWSE_CACHE_TTL_MS = 30 * 60 * 1000;

function normalizeQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function unwrapApplications(payload: unknown): MotorApplicationSummary[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const body = (root.Body ?? root.body ?? root) as Record<string, unknown>;
  const apps = body.Applications ?? body.applications;
  if (Array.isArray(apps)) return apps as MotorApplicationSummary[];
  if (apps && typeof apps === "object") {
    const a = apps as Record<string, unknown>;
    const items = a.Application ?? a.application ?? a.Items ?? a.items;
    if (Array.isArray(items)) return items as MotorApplicationSummary[];
    if (items && typeof items === "object") return [items as MotorApplicationSummary];
  }
  return [];
}

function unwrapWorkTimeItems(app: MotorApplicationSummary): MotorWorkTimeSummary[] {
  const raw = app.Items;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const nested = (raw as Record<string, unknown>).EstimatedWorkTimeSummary;
    if (Array.isArray(nested)) return nested as MotorWorkTimeSummary[];
    if (nested && typeof nested === "object") return [nested as MotorWorkTimeSummary];
  }
  return [];
}

function intervalToHours(value: number, interval?: string): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const unit = (interval ?? "Hours").toLowerCase();
  if (unit.startsWith("min")) return value / 60;
  return value;
}

function pickPrimaryHours(summaries: MotorWorkTimeSummary[]): number {
  const primary = summaries[0];
  if (!primary) return 0;
  const base = intervalToHours(primary.BaseLaborTime ?? 0, primary.LaborTimeInterval);
  if (base > 0) return base;
  const all = intervalToHours(primary.AllLaborTime ?? 0, primary.LaborTimeInterval);
  return all > 0 ? all : 0;
}

function inferUnitsOnVehicle(app: MotorApplicationSummary, jobName: string): number {
  const text = [
    app.DisplayName,
    app.Taxonomy?.LiteralName,
    app.Position?.Name,
    jobName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(vehicle|each|one)\b/.test(text)) return 1;
  if (/\b(both sides|both|left and right|pair|set of 2)\b/.test(text)) return 2;
  if (/\b(four|4|all wheels|all four)\b/.test(text)) return 4;
  if (/\b(two|2)\b/.test(text)) return 2;
  return 1;
}

function inferUnitLabel(jobName: string, units: number): string {
  const lower = jobName.toLowerCase();
  if (units === 1 && /\b(vehicle|engine|transmission|alignment)\b/.test(lower)) return "vehicle";
  if (/\bpad\b/.test(lower)) return units === 1 ? "pad set" : "pad set";
  if (/\brotor\b/.test(lower)) return "rotor";
  if (/\bstrut\b/.test(lower)) return "strut";
  if (/\bshock\b/.test(lower)) return "shock";
  if (/\bcaliper\b/.test(lower)) return "caliper";
  if (/\baxle\b/.test(lower)) return "axle";
  return units === 1 ? "vehicle" : "unit";
}

function qualifierLines(app: MotorApplicationSummary): string[] {
  const q = app.Qualifiers;
  if (!q) return [];
  if (Array.isArray(q)) {
    return q.map((x) => x.Description).filter(Boolean) as string[];
  }
  const infos = q.QualifierInfo;
  if (Array.isArray(infos)) {
    return infos.map((x) => x.Description).filter(Boolean) as string[];
  }
  return [];
}

function jobNameFromApplication(app: MotorApplicationSummary): string {
  return (
    app.Taxonomy?.LiteralName?.trim() ||
    app.DisplayName?.trim() ||
    [app.Taxonomy?.SystemName, app.Taxonomy?.GroupName, app.Taxonomy?.SubGroupName]
      .filter(Boolean)
      .join(" — ") ||
    "Labor operation"
  );
}

function mapApplicationToHit(
  app: MotorApplicationSummary,
  baseVehicleId: number,
): LaborGuideHit | null {
  const summaries = unwrapWorkTimeItems(app);
  const hoursPerUnit = pickPrimaryHours(summaries);
  if (hoursPerUnit <= 0) return null;

  const jobName = jobNameFromApplication(app);
  const unitsOnVehicle = inferUnitsOnVehicle(app, jobName);
  const unitLabel = inferUnitLabel(jobName, unitsOnVehicle);
  const totalHours =
    unitLabel === "vehicle" ? hoursPerUnit : hoursPerUnit * unitsOnVehicle;

  const ops = [jobName];
  if (app.Position?.Name) ops.push(app.Position.Name);
  for (const q of qualifierLines(app)) ops.push(q);

  const notesParts = summaries
    .map((s) => s.BaseLaborTimeDescription || s.AllLaborTimeDescription)
    .filter(Boolean);
  if (summaries[0]?.AdditionalLaborTimeDescription) {
    notesParts.push(summaries[0].AdditionalLaborTimeDescription);
  }

  const hit: LaborGuideHit = {
    id: `motor:${baseVehicleId}:${app.ApplicationID ?? jobName}`,
    jobName,
    queryText: jobName,
    totalHours,
    laborHoursPerUnit: hoursPerUnit,
    unitLabel,
    unitsOnVehicle,
    laborOperations: ops,
    notes: notesParts.join("; ") || "MOTOR Estimated Work Times",
    source: "catalog",
    confidenceScore: 0.92,
  };

  return hit;
}

async function fetchMotorApplications(
  baseVehicleId: number,
  opts: { searchTerm?: string; pageIndex?: number; itemsPerPage?: number },
): Promise<MotorApplicationSummary[]> {
  const res = await motorGet(
    `/Information/Vehicles/Attributes/BaseVehicleID/${baseVehicleId}/Content/Summaries/Of/EstimatedWorkTimes`,
    {
      SearchTerm: opts.searchTerm,
      PageIndex: opts.pageIndex ?? 0,
      ItemsPerPage: opts.itemsPerPage ?? 30,
      Include: "U",
      AttributeStandard: "MOTOR",
    },
  );
  if (!res.ok) return [];
  return unwrapApplications(res.data);
}

/** Fetch MOTOR labor operations for browse (cached per vehicle, paginated). */
export async function fetchMotorLaborGuide(vehicle: Vehicle): Promise<LaborGuideHit[]> {
  if (!isLicensedMotorCatalog()) return [];

  const baseVehicleId = await resolveMotorBaseVehicleId(vehicle);
  if (!baseVehicleId) return [];

  const cacheKey = String(baseVehicleId);
  const cached = browseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.hits;

  const pages = await Promise.all([
    fetchMotorApplications(baseVehicleId, { pageIndex: 0 }),
    fetchMotorApplications(baseVehicleId, { pageIndex: 1 }),
    fetchMotorApplications(baseVehicleId, { pageIndex: 2 }),
  ]);
  const apps = pages.flat();
  const hits = apps
    .map((app) => mapApplicationToHit(app, baseVehicleId))
    .filter((h): h is LaborGuideHit => h != null);

  browseCache.set(cacheKey, { hits, expiresAt: Date.now() + BROWSE_CACHE_TTL_MS });
  return hits;
}

/** Search MOTOR for a specific repair request. */
export async function findMotorLaborSuggestion(
  vehicle: Vehicle,
  request: string,
): Promise<LaborSuggestion | null> {
  if (!isLicensedMotorCatalog()) return null;

  const baseVehicleId = await resolveMotorBaseVehicleId(vehicle);
  if (!baseVehicleId) return null;

  const apps = await fetchMotorApplications(baseVehicleId, { searchTerm: request.trim() });
  if (!apps.length) {
    const q = normalizeQuery(request);
    const browse = await fetchMotorLaborGuide(vehicle);
    const fallback = browse.find(
      (h) =>
        normalizeQuery(h.jobName).includes(q) ||
        h.laborOperations.some((op) => normalizeQuery(op).includes(q)),
    );
    if (!fallback) return null;
    return motorHitToSuggestion(fallback);
  }

  const mapped = apps
    .map((app) => mapApplicationToHit(app, baseVehicleId))
    .filter((h): h is LaborGuideHit => h != null);
  if (!mapped.length) return null;

  const q = normalizeQuery(request);
  const ranked = [...mapped].sort((a, b) => {
    const aName = normalizeQuery(a.jobName);
    const bName = normalizeQuery(b.jobName);
    if (aName === q && bName !== q) return -1;
    if (bName === q && aName !== q) return 1;
    if (aName.includes(q) && !bName.includes(q)) return -1;
    if (bName.includes(q) && !aName.includes(q)) return 1;
    return 0;
  });

  return motorHitToSuggestion(ranked[0]!);
}

export function motorHitToSuggestion(hit: LaborGuideHit): LaborSuggestion | null {
  if (hit.laborHoursPerUnit == null || hit.unitLabel == null || hit.unitsOnVehicle == null) {
    return null;
  }
  return {
    jobName: hit.jobName,
    unitLabel: hit.unitLabel,
    unitsOnVehicle: hit.unitsOnVehicle,
    laborHoursPerUnit: hit.laborHoursPerUnit,
    laborOperations: hit.laborOperations,
    notes: hit.notes ?? "",
    confidenceScore: hit.confidenceScore ?? 0.92,
    reasoningSummary: "MOTOR Estimated Work Times (licensed catalog)",
  };
}
