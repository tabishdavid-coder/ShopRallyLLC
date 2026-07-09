import type { ROStatus } from "@/generated/prisma";

import type { BoardColumn } from "@/lib/job-board";

  /** ShopRally pipeline stage labels — industry-standard shop terminology. */
export const JOB_BOARD_COLUMN_META: Record<
  BoardColumn,
  { title: string; subtitle: string }
> = {
  estimates: {
    title: "Estimates",
    subtitle: "Quotes awaiting customer or shop authorization",
  },
  workInProgress: {
    title: "Work in Progress",
    subtitle: "Authorized jobs actively in the bay",
  },
  completed: {
    title: "Completed",
    subtitle: "Ready to invoice or collect payment",
  },
};

/** Branded column chrome — each column has a distinct status-zone tint. */
export const JOB_BOARD_COLUMN: Record<
  BoardColumn,
  { header: string; body: string; dropOver: string }
> = {
  estimates: {
    header: "job-board-col-header job-board-col-header-estimates",
    body: "job-board-col-body job-board-col-body-estimates",
    dropOver: "bg-amber-100/45",
  },
  workInProgress: {
    header: "job-board-col-header job-board-col-header-wip",
    body: "job-board-col-body job-board-col-body-wip",
    dropOver: "bg-brand-light/35",
  },
  completed: {
    header: "job-board-col-header job-board-col-header-completed",
    body: "job-board-col-body job-board-col-body-completed",
    dropOver: "bg-emerald-100/50",
  },
};

/** Shared chip base — single contextual label per card (Garage360-class density). */
const CHIP_BASE =
  "inline-flex h-5 w-fit max-w-full shrink-0 items-center gap-1 truncate rounded-md border px-2 py-0.5 text-[10px] font-semibold leading-none";

/** Primary context chips — one per card, priority-ordered in job-card.tsx. */
export const JOB_BOARD_CONTEXT_CHIP = {
  paid: `${CHIP_BASE} border-emerald-300/80 bg-emerald-50 text-emerald-800`,
  approved: `${CHIP_BASE} border-brand-navy/20 bg-brand-light/20 text-brand-navy`,
  pending: `${CHIP_BASE} border-amber-300/70 bg-amber-50 text-amber-900`,
  alert: `${CHIP_BASE} border-brand-red/35 bg-brand-red/8 text-brand-red`,
} as const;

/** Legacy status pills — used outside job cards (dashboard widgets, etc.). */
const PILL_BASE =
  "inline-flex h-5 w-fit shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold";

export const JOB_BOARD_STATUS_PILL: Record<
  ROStatus,
  { label: string; className: string }
> = {
  ESTIMATE: {
    label: "Quote",
    className: `${PILL_BASE} border-amber-300/70 bg-amber-50 text-amber-900`,
  },
  APPROVED: {
    label: "Active",
    className: `${PILL_BASE} border-brand-light/60 bg-brand-light/25 text-brand-navy`,
  },
  IN_PROGRESS: {
    label: "Active",
    className: `${PILL_BASE} border-brand-light/60 bg-brand-light/25 text-brand-navy`,
  },
  COMPLETED: {
    label: "Done",
    className: `${PILL_BASE} border-emerald-500/50 bg-emerald-50 text-emerald-800`,
  },
  INVOICED: {
    label: "Invoiced",
    className: `${PILL_BASE} border-emerald-600/50 bg-emerald-100 text-emerald-900`,
  },
};

export function jobBoardCardClass(opts: {
  selected: boolean;
  auth: "customer" | "shop" | null;
  column?: BoardColumn;
}): string {
  const parts = ["job-board-card"];
  if (opts.column) parts.push(`job-board-card-${opts.column}`);
  if (opts.selected) parts.push("job-board-card-selected");
  if (opts.auth === "customer") parts.push("job-board-card-customer-auth");
  if (opts.auth === "shop") parts.push("job-board-card-shop-auth");
  return parts.join(" ");
}
