import { textMatchesSubcategory } from "@/lib/labor-categories";
import { applyBrowseFacets } from "@/lib/labor-nav-facets";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborGuideHit } from "@/lib/labor-guide-types";

function cannedJobAsHit(job: CannedJobSummary): LaborGuideHit {
  return {
    id: job.id,
    jobName: job.name,
    queryText: job.description ?? undefined,
    totalHours: job.laborHours,
    laborOperations: [],
    source: "shop_custom",
    cannedJobId: job.id,
    category: job.category,
  };
}

/** Filter shop canned jobs to match labor-guide browse path (category → subcategory → facets). */
export function filterCannedJobsForBrowse(
  jobs: CannedJobSummary[],
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): CannedJobSummary[] {
  const inSubcategory = jobs.filter((j) =>
    textMatchesSubcategory(`${j.name} ${j.description ?? ""} ${j.category ?? ""}`, subcategoryId),
  );
  const hits = inSubcategory.map(cannedJobAsHit);
  const matchedIds = new Set(
    applyBrowseFacets(hits, subcategoryId, positionId, operationId).map((h) => h.cannedJobId ?? h.id),
  );
  return inSubcategory.filter((j) => matchedIds.has(j.id));
}

/** Text search across canned job fields — preview only, never mutates. */
export function filterCannedJobsByQuery(jobs: CannedJobSummary[], query: string): CannedJobSummary[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return jobs.filter(
    (j) =>
      j.name.toLowerCase().includes(needle) ||
      (j.category?.toLowerCase().includes(needle) ?? false) ||
      (j.description?.toLowerCase().includes(needle) ?? false),
  );
}
