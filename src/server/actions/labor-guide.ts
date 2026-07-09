"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import {
  classifyOperation,
  laborSubcategoryById,
  matchOperationsToSubcategory,
} from "@/lib/labor-categories";
import { applyBrowseFacets } from "@/lib/labor-nav-facets";
import type { LaborCartLine, LaborGuideHit } from "@/lib/labor-guide-types";
import { compactOperationName, guideJobName } from "@/lib/labor-guide-helpers";
import {
  enrichHitsWithPosition,
  isSiblingCandidate,
  parsePositionQuery,
} from "@/lib/labor-guide-search";
import { getShopId } from "@/lib/shop";
import { recomputeRoTotals } from "@/server/estimate";
import {
  browseCachedLaborBySubcategory,
  lookupLaborSuggestion,
  searchCachedLaborOperations,
  type LaborLookupOptions,
} from "@/server/labor-guide-cache";
import { getShopMatrices, shopLaborRate } from "@/server/pricing-matrix";
import type { LaborSuggestion, Vehicle as LaborServiceVehicle } from "@/server/services/labor-guide";
import {
  fetchCatalogLaborGuide,
  filterCatalogHits,
  isLaborCatalogServiceEnabled,
} from "@/server/services/labor-guide-catalog";
import { gates } from "@/server/permission-gates";

export type GenerateResult =
  | {
      ok: true;
      suggestion: LaborSuggestion;
      cached: boolean;
      auditWarnings?: string[];
      dataSource?: string;
      categoryPath?: string;
    }
  | { ok: false; error: string };

export type SearchResult =
  | { ok: true; hits: LaborGuideHit[] }
  | { ok: false; error: string };

/** Vehicle fields used for labor cache lookup (DB row or ephemeral quick lookup). */
export type LaborGuideVehicle = {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  drivetrain?: string | null;
};

function toLaborServiceVehicle(vehicle: LaborGuideVehicle): LaborServiceVehicle {
  return {
    vin: vehicle.vin ?? null,
    year: vehicle.year ?? null,
    make: vehicle.make ?? null,
    model: vehicle.model ?? null,
    trim: vehicle.trim ?? null,
    engine: vehicle.engine ?? null,
    drivetrain: vehicle.drivetrain ?? null,
  };
}

const vehicleSelect = {
  vin: true,
  year: true,
  make: true,
  model: true,
  trim: true,
  engine: true,
  drivetrain: true,
} as const;

async function loadVehicle(vehicleId: string) {
  const shopId = await getShopId();
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: vehicleSelect,
  });
  if (!vehicle) return null;
  return { shopId, vehicle };
}

function cannedToHit(row: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  laborLines: { description: string; hours: number }[];
}): LaborGuideHit {
  const laborOperations = row.laborLines.map((l) => l.description);
  const totalHours = row.laborLines.reduce((s, l) => s + l.hours, 0);
  return {
    id: `canned:${row.id}`,
    cannedJobId: row.id,
    jobName: row.name,
    queryText: row.description ?? undefined,
    totalHours,
    laborOperations,
    notes: row.description ?? undefined,
    source: "shop_custom",
    category: row.category,
    ...classifyFields(row.name, row.description ?? undefined),
  };
}

function classifyFields(name: string, queryText?: string) {
  const cls = classifyOperation(name, queryText);
  return {
    categoryId: cls.categoryId,
    subcategoryId: cls.subcategoryId,
    categoryPath: cls.breadcrumb,
  };
}

async function searchCannedHits(
  shopId: string,
  query: string,
  subcategoryId?: string,
): Promise<LaborGuideHit[]> {
  const sub = subcategoryId ? laborSubcategoryById(subcategoryId) : undefined;
  const rows = await prisma.cannedJob.findMany({
    where: { shopId, isActive: true },
    include: { laborLines: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ usageCount: "desc" }, { name: "asc" }],
    take: 100,
  });

  const needle = query.trim().toLowerCase();
  return rows
    .filter((row) => {
      const text = [row.name, row.description ?? "", row.category ?? ""].join(" ");
      if (sub) {
        if (subcategoryId === "other-general") return !row.category;
        const inSubcategory =
          matchOperationsToSubcategory(subcategoryId!, [{ jobName: text }]).length > 0;
        if (!needle) return inSubcategory;
        return (
          inSubcategory &&
          (row.name.toLowerCase().includes(needle) ||
            (row.description?.toLowerCase().includes(needle) ?? false) ||
            (row.category?.toLowerCase().includes(needle) ?? false))
        );
      }
      if (!needle) return !sub;
      return (
        row.name.toLowerCase().includes(needle) ||
        (row.description?.toLowerCase().includes(needle) ?? false) ||
        (row.category?.toLowerCase().includes(needle) ?? false)
      );
    })
    .slice(0, 15)
    .map(cannedToHit);
}

/** Merge cached + canned hits, dedupe by job name, cached first. */
function mergeHits(cached: LaborGuideHit[], canned: LaborGuideHit[], limit = 30): LaborGuideHit[] {
  const seen = new Set<string>();
  const out: LaborGuideHit[] = [];
  for (const hit of [...cached, ...canned]) {
    const key = hit.laborOperationId ?? hit.cannedJobId ?? hit.id;
    const dedupe = `${key}:${hit.jobName.toLowerCase()}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push(hit);
    if (out.length >= limit) break;
  }
  return out;
}

/** Deduplicate enriched position hits (derived rows may share the same base id). */
function dedupeEnrichedHits(hits: LaborGuideHit[]): LaborGuideHit[] {
  const seen = new Set<string>();
  const out: LaborGuideHit[] = [];
  for (const hit of hits) {
    const key = hit.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

/**
 * Cache-first labor guide search — shop library + global cache only ($0).
 * Never calls the AI provider.
 */
export async function searchLaborGuideForVehicle(
  shopId: string,
  vehicle: LaborGuideVehicle,
  query: string,
): Promise<SearchResult> {
  const denied = await gates.estimateView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const q = query.trim();
  if (!q) return { ok: true, hits: [] };

  const pq = parsePositionQuery(q);
  const searchTerms = pq.coreQuery && pq.positions.length ? [q, pq.coreQuery] : [q];

  try {
    const v = toLaborServiceVehicle(vehicle);
    const cachedBatches = await Promise.all(
      searchTerms.map((term) => searchCachedLaborOperations(v, term)),
    );
    let cached = mergeHits(cachedBatches.flat(), [], 40);

    if (pq.positions.length && pq.coreQuery) {
      const siblings = await searchCachedLaborOperations(v, pq.coreQuery, 60);
      const siblingHits = siblings.filter((h) => isSiblingCandidate(h, pq));
      cached = mergeHits(cached, siblingHits, 50);
    }

    const cannedBatches = await Promise.all(
      searchTerms.map((term) => searchCannedHits(shopId, term)),
    );
    const canned = cannedBatches.flat();

    let catalogHits: LaborGuideHit[] = [];
    if (isLaborCatalogServiceEnabled()) {
      const catalog = await fetchCatalogLaborGuide(v);
      if (catalog.ok) {
        catalogHits = filterCatalogHits(catalog.hits, { query: q });
      }
    }

    const merged = mergeHits(mergeHits(cached, canned), catalogHits);
    const enriched = dedupeEnrichedHits(enrichHitsWithPosition(merged, q));
    return { ok: true, hits: enriched };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Search failed." };
  }
}

/** Cache-first labor guide search — shop library + global cache only ($0). */
export async function searchLaborGuide(vehicleId: string, query: string): Promise<SearchResult> {
  const loaded = await loadVehicle(vehicleId);
  if (!loaded) return { ok: false, error: "Vehicle not found." };
  const denied = await gates.estimateView(loaded.shopId);
  if (denied) return { ok: false, error: denied.error };
  return searchLaborGuideForVehicle(loaded.shopId, loaded.vehicle, query);
}

/** Browse cached ops + canned jobs for a vehicle + subcategory ($0). */
export async function browseLaborGuideForVehicle(
  shopId: string,
  vehicle: LaborGuideVehicle,
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): Promise<SearchResult> {
  const denied = await gates.estimateView(shopId);
  if (denied) return { ok: false, error: denied.error };

  if (!laborSubcategoryById(subcategoryId)) {
    return { ok: false, error: "Unknown subcategory." };
  }

  try {
    const v = toLaborServiceVehicle(vehicle);
    const [cached, canned] = await Promise.all([
      browseCachedLaborBySubcategory(v, subcategoryId),
      searchCannedHits(shopId, "", subcategoryId),
    ]);

    let catalogHits: LaborGuideHit[] = [];
    if (isLaborCatalogServiceEnabled()) {
      const catalog = await fetchCatalogLaborGuide(v);
      if (catalog.ok) {
        catalogHits = filterCatalogHits(catalog.hits, { subcategoryId });
      }
    }

    const merged = mergeHits(mergeHits(cached, canned), catalogHits, 40);
    const filtered = applyBrowseFacets(merged, subcategoryId, positionId, operationId);
    return { ok: true, hits: filtered };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Browse failed." };
  }
}

/** Browse cached ops + canned jobs for a vehicle + subcategory ($0). */
export async function browseLaborGuideSubcategory(
  vehicleId: string,
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): Promise<SearchResult> {
  const loaded = await loadVehicle(vehicleId);
  if (!loaded) return { ok: false, error: "Vehicle not found." };
  const denied = await gates.estimateView(loaded.shopId);
  if (denied) return { ok: false, error: denied.error };

  return browseLaborGuideForVehicle(
    loaded.shopId,
    loaded.vehicle,
    subcategoryId,
    positionId,
    operationId,
  );
}

/**
 * Explicit AI generate — checks cache first, calls Anthropic only on miss/stale.
 */
export async function generateLaborSuggestionForVehicle(
  vehicle: LaborGuideVehicle,
  request: string,
  motorContext: LaborLookupOptions = {},
): Promise<GenerateResult> {
  if (!request.trim()) return { ok: false, error: "Describe the repair first." };

  try {
    const { suggestion, cached, auditWarnings, dataSource, categoryPath } =
      await lookupLaborSuggestion(toLaborServiceVehicle(vehicle), request, motorContext);
    return { ok: true, suggestion, cached, auditWarnings, dataSource, categoryPath };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Labor Book failed." };
  }
}

/**
 * Explicit AI generate — checks cache first, calls Anthropic only on miss/stale.
 * Used only when the writer clicks Generate (never from debounced search).
 */
export async function generateLaborSuggestion(
  vehicleId: string,
  request: string,
  motorContext: LaborLookupOptions = {},
): Promise<GenerateResult> {
  if (!request.trim()) return { ok: false, error: "Describe the repair first." };

  const loaded = await loadVehicle(vehicleId);
  if (!loaded) return { ok: false, error: "Vehicle not found." };
  const denied = await gates.estimateEdit(loaded.shopId);
  if (denied) return { ok: false, error: denied.error };

  return generateLaborSuggestionForVehicle(loaded.vehicle, request, motorContext);
}

export type AddJobResult = { ok: true; count: number } | { ok: false; error: string };

/** One labor item the writer chose from the guide, with its quantity. */
export type CartItem = { suggestion: LaborSuggestion; quantity: number };

/** Build the Prisma `job.create` data for one labor-only suggestion + quantity. */
function buildJobData(
  item: CartItem,
  shopId: string,
  baseRate: number,
  laborTiers: { minHours: number; maxHours: number | null; multiplier: number }[],
) {
  const qty = Math.max(1, Math.round(item.quantity || 1));
  const { suggestion } = item;
  const totalHours = suggestion.laborHoursPerUnit * qty;
  const rate = shopLaborRate(baseRate, totalHours, laborTiers);
  const laborTotal = Math.round(totalHours * rate);

  const countable = suggestion.unitLabel.toLowerCase() !== "vehicle";
  const baseJobName = guideJobName(suggestion.jobName);
  const jobName = countable && qty > 1 ? `${baseJobName} (×${qty})` : baseJobName;
  const laborDesc =
    compactOperationName(suggestion.laborOperations[0]?.trim() || suggestion.jobName) || baseJobName;

  return {
    shopId,
    name: jobName,
    note: suggestion.notes || null,
    laborLines: {
      create: [
        {
          shopId,
          description: laborDesc,
          hours: totalHours,
          rateCents: rate,
          totalCents: laborTotal,
        },
      ],
    },
  };
}

/**
 * Add one or more labor items from the guide to a repair order. Each item
 * becomes its OWN job (labor only — no parts).
 */
export async function addSuggestedJobs(
  roId: string,
  items: CartItem[],
): Promise<AddJobResult> {
  if (!items.length) return { ok: false, error: "Add at least one labor item first." };

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const [ro, { laborTiers }] = await Promise.all([
    prisma.repairOrder.findFirst({
      where: { id: roId, shopId },
      select: { id: true, laborRateCents: true, shop: { select: { laborRateCents: true } } },
    }),
    getShopMatrices(shopId),
  ]);
  if (!ro) return { ok: false, error: "Repair order not found." };

  const baseRate = ro.laborRateCents ?? ro.shop.laborRateCents;

  await prisma.$transaction(
    items.map((item) =>
      prisma.job.create({
        data: { ...buildJobData(item, shopId, baseRate, laborTiers), repairOrderId: roId },
      }),
    ),
  );

  await recomputeRoTotals(roId);
  for (const path of revalidateEstimatePaths(roId)) {
    revalidatePath(path);
  }
  return { ok: true, count: items.length };
}

/**
 * Create ONE job with multiple labor lines from the labor guide cart.
 * Single-job labor lookup pattern for estimate line creation.
 */
export async function addLaborGuideJob(
  roId: string,
  jobName: string,
  lines: Omit<LaborCartLine, "key">[],
): Promise<AddJobResult> {
  const trimmed = jobName.trim();
  if (!trimmed) return { ok: false, error: "Enter a job name." };
  if (!lines.length) return { ok: false, error: "Add at least one labor line." };

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const [ro, { laborTiers }] = await Promise.all([
    prisma.repairOrder.findFirst({
      where: { id: roId, shopId },
      select: { id: true, laborRateCents: true, shop: { select: { laborRateCents: true } } },
    }),
    getShopMatrices(shopId),
  ]);
  if (!ro) return { ok: false, error: "Repair order not found." };

  const baseRate = ro.laborRateCents ?? ro.shop.laborRateCents;
  const lastJob = await prisma.job.findFirst({
    where: { repairOrderId: roId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.job.create({
    data: {
      shopId,
      repairOrderId: roId,
      name: trimmed,
      sortOrder: (lastJob?.sortOrder ?? 0) + 1,
      laborLines: {
        create: lines.map((line) => {
          const hours = Math.max(0, line.hours);
          const rateCents = shopLaborRate(baseRate, hours, laborTiers);
          return {
            shopId,
            description: line.description.trim() || trimmed,
            hours,
            rateCents,
            totalCents: Math.round(hours * rateCents),
          };
        }),
      },
    },
  });

  await recomputeRoTotals(roId);
  for (const path of revalidateEstimatePaths(roId)) {
    revalidatePath(path);
  }
  return { ok: true, count: 1 };
}
