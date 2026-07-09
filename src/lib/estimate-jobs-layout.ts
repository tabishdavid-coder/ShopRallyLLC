import type { EstimateJobsLayout } from "@/generated/prisma";

export type { EstimateJobsLayout };

/** Jobs layout toggle — inline grid vs separate labor/parts tables (shop setting). */
export function isEstimateJobsLayoutToggleEnabled(): boolean {
  return true;
}

export function resolveEstimateJobsLayout(shopLayout: EstimateJobsLayout): EstimateJobsLayout {
  return shopLayout;
}

export const ESTIMATE_JOBS_LAYOUT_LABELS: Record<EstimateJobsLayout, string> = {
  INLINE: "Inline grid",
  TEKMETRIC: "Separate tables",
};

export const ESTIMATE_JOBS_LAYOUT_DESCRIPTIONS: Record<EstimateJobsLayout, string> = {
  INLINE:
    "Unified labor and parts grid inside each job card — inline editing with matrix pricing pills and quick-add rows.",
  TEKMETRIC:
    "Separate labor and parts tables on each job card — collapsible cards with view/edit mode and matrix pricing.",
};

/** Maps shop layout preference to EstimateJobCard / EstimateJobsList variant. */
export function estimateJobsLayoutToVariant(
  layout: EstimateJobsLayout,
): "default" | "lab" {
  return layout === "INLINE" ? "lab" : "default";
}

export function isInlineJobsLayout(layout: EstimateJobsLayout): boolean {
  return layout === "INLINE";
}
