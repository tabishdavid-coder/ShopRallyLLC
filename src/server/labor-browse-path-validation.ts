import "server-only";

import { prisma } from "@/db/client";
import { enrichHitClassification, matchOperationsToSubcategory } from "@/lib/labor-categories";
import {
  LABOR_BROWSE_TEST_PATHS,
  validateBrowsePathHierarchy,
  type LaborBrowsePathDefinition,
} from "@/lib/labor-browse-paths";
import { applyBrowseFacets } from "@/lib/labor-nav-facets";
import {
  storedRowMatchesVehicle,
  vehicleKeysForLookup,
  vehicleKeyMatchRank,
} from "@/lib/labor-vehicle-key";
import type { LaborGuideHit } from "@/lib/labor-guide-types";
import type { Vehicle } from "@/server/services/labor-guide";

export type LaborPathValidationResult = {
  def: LaborBrowsePathDefinition;
  hierarchyOk: boolean;
  hierarchyErrors: string[];
  cacheHitCount: number;
  sampleHits: Pick<LaborGuideHit, "jobName" | "totalHours" | "categoryPath">[];
  vehicleRowCount: number;
};

function toVehicle(def: LaborBrowsePathDefinition): Vehicle {
  const v = def.vehicle;
  return {
    vin: v.vin ?? null,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim ?? null,
    engine: v.engine ?? null,
    drivetrain: null,
  };
}

async function fetchVehicleRows(vehicle: Vehicle, take = 400) {
  const keys = vehicleKeysForLookup(vehicle);
  const [keyRows, ymmRows] = await Promise.all([
    prisma.laborOperation.findMany({
      where: { vehicleKey: { in: keys } },
      orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
      take: take * 3,
    }),
    vehicle.year != null && vehicle.make?.trim()
      ? prisma.laborOperation.findMany({
          where: {
            vehicleYear: vehicle.year,
            vehicleMake: { equals: vehicle.make, mode: "insensitive" },
          },
          orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
          take: take * 3,
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, (typeof keyRows)[0]>();
  for (const row of [...keyRows, ...ymmRows]) byId.set(row.id, row);
  return [...byId.values()].filter((row) => storedRowMatchesVehicle(row, vehicle));
}

async function browseHitsForPath(def: LaborBrowsePathDefinition): Promise<LaborGuideHit[]> {
  const vehicle = toVehicle(def);
  const rows = await fetchVehicleRows(vehicle);
  const hits: LaborGuideHit[] = rows.map((row) => {
    const totalHours =
      row.unitLabel.toLowerCase() === "vehicle"
        ? row.laborHoursPerUnit
        : row.laborHoursPerUnit * row.unitsOnVehicle;
    const base: LaborGuideHit = {
      id: `cache:${row.id}`,
      laborOperationId: row.id,
      jobName: row.jobName,
      queryText: row.queryText,
      totalHours,
      laborHoursPerUnit: row.laborHoursPerUnit,
      unitLabel: row.unitLabel,
      unitsOnVehicle: row.unitsOnVehicle,
      laborOperations: row.laborOperations,
      notes: row.notes ?? undefined,
      source: "cached",
    };
    return enrichHitClassification(base, row.queryKey);
  });
  const inSub = matchOperationsToSubcategory(def.browsePath.subcategoryId, hits);
  return applyBrowseFacets(
    inSub,
    def.browsePath.subcategoryId,
    def.browsePath.positionId,
    def.browsePath.operationId,
  );
}

export async function validateLaborBrowsePaths(): Promise<{
  results: LaborPathValidationResult[];
  sampleRo: { id: string; number: number; vehicleId: string; label: string } | null;
}> {
  const results: LaborPathValidationResult[] = [];

  for (const def of LABOR_BROWSE_TEST_PATHS) {
    const hierarchy = validateBrowsePathHierarchy(def);
    const vehicle = toVehicle(def);
    const vehicleRows = await fetchVehicleRows(vehicle);
    const hits = await browseHitsForPath(def);

    results.push({
      def,
      hierarchyOk: hierarchy.ok,
      hierarchyErrors: hierarchy.errors,
      cacheHitCount: hits.length,
      sampleHits: hits.slice(0, 6).map((h) => ({
        jobName: h.jobName,
        totalHours: h.totalHours,
        categoryPath: h.categoryPath,
      })),
      vehicleRowCount: vehicleRows.length,
    });
  }

  const ro = await prisma.repairOrder.findFirst({
    where: {
      vehicle: {
        OR: [
          { vin: "19XFA1F51AE028415" },
          { year: 2010, make: { equals: "Honda", mode: "insensitive" }, model: { contains: "Civic", mode: "insensitive" } },
        ],
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      number: true,
      vehicleId: true,
      vehicle: { select: { year: true, make: true, model: true, vin: true } },
    },
  });

  const sampleRo = ro
    ? {
        id: ro.id,
        number: ro.number,
        vehicleId: ro.vehicleId,
        label: `${ro.number} · ${[ro.vehicle.year, ro.vehicle.make, ro.vehicle.model].filter(Boolean).join(" ")}`,
      }
    : null;

  return { results, sampleRo };
}
