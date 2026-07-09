import { laborRate, partRetail, type LaborTier, type PartTier } from "@/lib/matrix";
import type { CannedJobDetail, CannedJobSummary } from "@/lib/canned-job-types";

export type CannedJobEstimatePreview = {
  laborCents: number;
  partsCents: number;
  totalCents: number;
};

/** Estimate retail total when a canned job is applied (uses shop rate + matrices). */
export function estimateCannedJobTotal(
  job: Pick<CannedJobDetail, "laborLines" | "partLines">,
  baseRateCents: number,
  partTiers: PartTier[],
  laborTiers: LaborTier[],
): CannedJobEstimatePreview {
  const laborCents = job.laborLines.reduce((sum, line) => {
    const rate = laborRate(baseRateCents, line.hours, laborTiers);
    return sum + (line.flatAmountCents ?? Math.round(line.hours * rate));
  }, 0);
  const partsCents = job.partLines.reduce((sum, line) => {
    const retail = partRetail(line.costCents, partTiers);
    return sum + retail * line.quantity;
  }, 0);
  return { laborCents, partsCents, totalCents: laborCents + partsCents };
}

/** Rough preview from list summary (no flat-amount overrides). */
export function estimateCannedJobSummaryTotal(
  job: CannedJobSummary,
  baseRateCents: number,
  partTiers: PartTier[],
  laborTiers: LaborTier[],
): CannedJobEstimatePreview {
  const rate = laborRate(baseRateCents, job.laborHours, laborTiers);
  const laborCents = Math.round(job.laborHours * rate);
  const partsCents = partRetail(job.partsCostCents, partTiers);
  return { laborCents, partsCents, totalCents: laborCents + partsCents };
}
