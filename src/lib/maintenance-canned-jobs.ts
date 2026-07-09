import type { CannedJobSummary } from "@/lib/canned-job-types";

/** Estimated shop cost for one canned-job redemption (parts + labor at rate). */
export function estimateCannedJobUnitCostCents(
  job: Pick<CannedJobSummary, "partsCostCents" | "laborHours">,
  laborRateCents: number,
): number {
  const laborCents = Math.round(job.laborHours * laborRateCents);
  return job.partsCostCents + laborCents;
}

export function formatCannedJobCostHint(
  job: Pick<CannedJobSummary, "partsCostCents" | "laborHours" | "laborLineCount" | "partLineCount">,
  laborRateCents: number,
): string {
  const total = estimateCannedJobUnitCostCents(job, laborRateCents);
  const parts = (job.partsCostCents / 100).toFixed(2);
  const hrs = job.laborHours.toFixed(1);
  return `$${(total / 100).toFixed(2)} est. (${hrs} hrs + $${parts} parts)`;
}
