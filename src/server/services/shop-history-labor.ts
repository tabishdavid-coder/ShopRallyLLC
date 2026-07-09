import "server-only";

import { prisma } from "@/db/client";
import { classifyOperation } from "@/lib/labor-categories";
import type { LaborSuggestion, Vehicle } from "@/server/services/labor-guide";

/**
 * Shop-history labor authority (LABOR-ESTIMATE-ALGORITHM.md T1-lite / tier SHOP).
 *
 * When a shop has repeatedly billed a similar job on the same vehicle family, its
 * OWN actuals are a more honest hours source than an ungrounded AI guess. This
 * resolver mines `LaborLine.hours` from prior repair orders and returns the
 * median when enough samples exist. It uses NO hardcoded floors/ceilings — the
 * number is real observed data, labeled `shop_history` (tier SHOP) so the UI
 * shows it as the shop's own time rather than a book time.
 *
 * These are advisor-entered *billed* hours, not clocked wrench time (no TimeLog
 * model yet), so the tier is SHOP (verify-optional) — not BOOK.
 */

export const SHOP_HISTORY_MIN_SAMPLES = 3;

/** Cap rows scanned per lookup so a busy shop can't blow up the query. */
const MAX_HISTORY_ROWS = 400;

export type ShopHistoryLaborResult = {
  suggestion: LaborSuggestion;
  /** How many matching historical labor lines fed the median. */
  sampleCount: number;
  /** Median billed hours across the matches. */
  medianHours: number;
};

function median(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedAsc[mid - 1]! + sortedAsc[mid]!) / 2 : sortedAsc[mid]!;
}

/** Front/rear axle position, when the text names one — used to keep medians honest. */
function positionOf(text: string): "front" | "rear" | null {
  const t = text.toLowerCase();
  const hasFront = /\bfront\b/.test(t);
  const hasRear = /\brear\b/.test(t);
  if (hasFront && !hasRear) return "front";
  if (hasRear && !hasFront) return "rear";
  return null;
}

function mostCommon(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = v.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [k, n] of counts) {
    if (n > bestN) {
      best = k;
      bestN = n;
    }
  }
  return best;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve labor hours from this shop's own history for a vehicle + request.
 * Returns null when the shop lacks make/model, or has fewer than `minSamples`
 * matching lines (in which case the caller should fall through to AI draft).
 */
export async function resolveShopHistoryLabor(
  shopId: string,
  vehicle: Vehicle,
  request: string,
  opts?: { minSamples?: number },
): Promise<ShopHistoryLaborResult | null> {
  const make = vehicle.make?.trim();
  const model = vehicle.model?.trim();
  // Need at least a make + model family to compare against; VIN/YMM handled upstream.
  if (!make || !model) return null;

  const reqCls = classifyOperation(request, request);
  if (!reqCls.subcategoryId) return null;

  const minSamples = Math.max(1, opts?.minSamples ?? SHOP_HISTORY_MIN_SAMPLES);

  // Vehicle family: prefer YMM, fall back to make+model when the year is unknown.
  const familyVehicle =
    vehicle.year != null
      ? {
          year: vehicle.year,
          make: { equals: make, mode: "insensitive" as const },
          model: { equals: model, mode: "insensitive" as const },
        }
      : {
          make: { equals: make, mode: "insensitive" as const },
          model: { equals: model, mode: "insensitive" as const },
        };

  const lines = await prisma.laborLine.findMany({
    where: {
      shopId,
      hours: { gt: 0 },
      job: { repairOrder: { vehicle: familyVehicle } },
    },
    select: {
      hours: true,
      description: true,
      job: { select: { name: true } },
    },
    orderBy: { id: "desc" },
    take: MAX_HISTORY_ROWS,
  });

  if (lines.length < minSamples) return null;

  const reqPos = positionOf(request);

  const matched = lines.filter((line) => {
    const text = `${line.job.name} ${line.description}`;
    const cls = classifyOperation(line.description, text);
    if (cls.subcategoryId !== reqCls.subcategoryId) return false;
    // When the request names an axle, don't blend front + rear medians together.
    if (reqPos) {
      const linePos = positionOf(text);
      if (linePos && linePos !== reqPos) return false;
    }
    return true;
  });

  if (matched.length < minSamples) return null;

  const sortedHours = matched.map((m) => m.hours).sort((a, b) => a - b);
  const medianHours = median(sortedHours);
  if (!(medianHours > 0)) return null;

  const jobName = mostCommon(matched.map((m) => m.job.name)) ?? request.trim() || "Labor";
  const n = matched.length;
  // Honest, sample-scaled confidence — never a flat 0.5. Caps at 0.9 (SHOP, not BOOK).
  const confidenceScore = Math.min(0.9, 0.6 + 0.05 * n);
  const familyLabel = [vehicle.year, make, model].filter(Boolean).join(" ");

  const suggestion: LaborSuggestion = {
    jobName,
    unitLabel: "vehicle",
    unitsOnVehicle: 1,
    laborHoursPerUnit: round2(medianHours),
    laborOperations: [jobName],
    notes: `Shop history: median of ${n} similar ${familyLabel} job${
      n === 1 ? "" : "s"
    } billed at this shop. Verify before quoting.`,
    confidenceScore,
    reasoningSummary: `Median billed labor hours from ${n} prior repair orders on the same vehicle family (${reqCls.breadcrumb}).`,
  };

  return { suggestion, sampleCount: n, medianHours: round2(medianHours) };
}
