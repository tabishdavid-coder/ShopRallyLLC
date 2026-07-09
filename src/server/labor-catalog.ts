import "server-only";

import { prisma } from "@/db/client";

/**
 * Read model for the Labor Guide catalog page — a browsable view of the global
 * LaborOperation dataset (the cached flat-rate labor times that power the
 * estimate's Smart Labor Guide). The table is GLOBAL (not shop-scoped), so this
 * is shared reference data, not tenant data.
 */

const TTL_DAYS = Number(process.env.LABOR_CACHE_TTL_DAYS) || 180;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export type LaborCatalogRow = {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleEngine: string | null;
  jobName: string;
  queryText: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  notes: string | null;
  source: string;
  model: string | null;
  hitCount: number;
  refreshedAt: Date;
  stale: boolean;
};

export type LaborCatalogStats = {
  total: number;
  distinctVehicles: number;
  bySource: { source: string; count: number }[];
  staleCount: number;
  totalHits: number;
  ttlDays: number;
};

export type LaborCatalog = {
  rows: LaborCatalogRow[];
  stats: LaborCatalogStats;
  cap: number;
  capped: boolean;
};

/**
 * Load the catalog: up to `cap` rows (most-used first) plus dataset-wide stats.
 * Stats are computed over the whole table so they're accurate even when the row
 * list is capped.
 */
export async function getLaborCatalog(cap = 1000): Promise<LaborCatalog> {
  const cutoff = new Date(Date.now() - TTL_MS);

  const [total, rows, bySource, staleCount, hitAgg, distinctVehicles] =
    await Promise.all([
      prisma.laborOperation.count(),
      prisma.laborOperation.findMany({
        orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
        take: cap,
        select: {
          id: true,
          vehicleYear: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleEngine: true,
          jobName: true,
          queryText: true,
          unitLabel: true,
          unitsOnVehicle: true,
          laborHoursPerUnit: true,
          notes: true,
          source: true,
          model: true,
          hitCount: true,
          refreshedAt: true,
        },
      }),
      prisma.laborOperation.groupBy({ by: ["source"], _count: { _all: true } }),
      prisma.laborOperation.count({ where: { refreshedAt: { lt: cutoff } } }),
      prisma.laborOperation.aggregate({ _sum: { hitCount: true } }),
      prisma.laborOperation.findMany({
        distinct: ["vehicleKey"],
        select: { vehicleKey: true },
      }),
    ]);

  return {
    rows: rows.map((r) => ({ ...r, stale: r.refreshedAt < cutoff })),
    stats: {
      total,
      distinctVehicles: distinctVehicles.length,
      bySource: bySource
        .map((s) => ({ source: s.source, count: s._count._all }))
        .sort((a, b) => b.count - a.count),
      staleCount,
      totalHits: hitAgg._sum.hitCount ?? 0,
      ttlDays: TTL_DAYS,
    },
    cap,
    capped: total > cap,
  };
}
