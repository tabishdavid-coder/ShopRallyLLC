import type { ROStatus } from "@/generated/prisma";

/** Canonical user-facing labels for the persisted RO workflow status. */
export const RO_STATUS_LABEL: Record<ROStatus, string> = {
  ESTIMATE: "Estimate",
  APPROVED: "Approved",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  INVOICED: "Invoiced",
};

/** Shared RO status pill styles — semantic workflow colors, higher contrast. */
export const RO_STATUS_PILL: Record<
  ROStatus,
  { label: string; className: string }
> = {
  ESTIMATE: {
    label: RO_STATUS_LABEL.ESTIMATE,
    className: "border border-border bg-muted text-foreground/80",
  },
  APPROVED: {
    label: RO_STATUS_LABEL.APPROVED,
    className: "border border-brand-light/35 bg-brand-light/10 text-brand-navy",
  },
  IN_PROGRESS: {
    label: RO_STATUS_LABEL.IN_PROGRESS,
    className: "border border-brand-light/35 bg-brand-light/10 text-brand-navy",
  },
  COMPLETED: {
    label: RO_STATUS_LABEL.COMPLETED,
    className: "border border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  INVOICED: {
    label: RO_STATUS_LABEL.INVOICED,
    className: "border border-emerald-200 bg-emerald-50 text-emerald-900",
  },
};
