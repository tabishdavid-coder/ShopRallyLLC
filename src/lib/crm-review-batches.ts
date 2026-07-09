/** Shop CRM release review batches — current vs planned operator changes. */

export type CrmReviewBatchStatus = "approved" | "review" | "upcoming";

export type CrmReviewStop = {
  id: string;
  label: string;
  /** Live route under Shop CRM (planned state on branch). */
  href: string;
};

export type CrmReviewBatch = {
  id: string;
  title: string;
  status: CrmReviewBatchStatus;
  summary: string;
  designReviewPath: string;
  stops: CrmReviewStop[];
};

export const CURRENT_CRM_REVIEW_BATCH_ID = "batch-06";

export const CRM_REVIEW_BATCHES: CrmReviewBatch[] = [
  {
    id: "batch-05",
    title: "Create RO intake",
    status: "approved",
    summary: "FAB slide-over, CrmFormLayout intake sections, full-page fallback, sidebar on new RO.",
    designReviewPath: "/design-review/batch-05-ro-intake",
    stops: [
      { id: "INTAKE-01", label: "FAB slide-over", href: "/dashboard" },
      { id: "INTAKE-02", label: "Intake form sections", href: "/dashboard" },
      { id: "INTAKE-03", label: "Full-page new RO", href: "/repair-orders/new" },
      { id: "INTAKE-04", label: "New RO keeps sidebar", href: "/repair-orders/new" },
    ],
  },
  {
    id: "batch-06",
    title: "Clerk landing & merge prep",
    status: "approved",
    summary: "Post-auth /home routing docs, Clerk env vars, feature/master-crm → main checklist.",
    designReviewPath: "/design-review/batch-06-clerk-merge",
    stops: [
      { id: "CLERK-01", label: "Post-auth /home routing", href: "/dashboard" },
      { id: "CLERK-02", label: "Auth baseline", href: "/design-review/task-02-auth" },
      { id: "CLERK-03", label: "Clerk integrations", href: "/settings/integrations" },
      { id: "MERGE-01", label: "Batches approved", href: "/design-review/batch-06-clerk-merge" },
      { id: "MERGE-02", label: "Merge to main", href: "/design-review/batch-06-clerk-merge" },
    ],
  },
];

export function getCrmReviewBatch(id: string): CrmReviewBatch | undefined {
  return CRM_REVIEW_BATCHES.find((b) => b.id === id);
}

export function getCurrentCrmReviewBatch(): CrmReviewBatch | undefined {
  return getCrmReviewBatch(CURRENT_CRM_REVIEW_BATCH_ID);
}

/** Live Shop CRM URL with review tour query (highlights planned UI). */
export function crmReviewLiveHref(batchId: string, stop: CrmReviewStop): string {
  const q = new URLSearchParams({ review: batchId, stop: stop.id });
  if (stop.id === "INTAKE-02") {
    q.set("openIntake", "1");
  }
  return `${stop.href}?${q.toString()}`;
}
