import type { ROStatus } from "@/generated/prisma";

/** Shared RO status pill styles — semantic workflow colors, higher contrast. */
export const RO_STATUS_PILL: Record<
  ROStatus,
  { label: string; className: string }
> = {
  ESTIMATE: {
    label: "Not Started",
    className: "border border-border bg-muted text-foreground/80",
  },
  APPROVED: {
    label: "Work In Progress",
    className: "border border-brand-light/35 bg-brand-light/10 text-brand-navy",
  },
  IN_PROGRESS: {
    label: "Work In Progress",
    className: "border border-brand-light/35 bg-brand-light/10 text-brand-navy",
  },
  COMPLETED: {
    label: "Completed",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  INVOICED: {
    label: "Invoiced",
    className: "border border-emerald-200 bg-emerald-50 text-emerald-900",
  },
};
