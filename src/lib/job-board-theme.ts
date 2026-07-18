import type { ROStatus } from "@/generated/prisma";

import type { BoardColumn } from "@/lib/job-board";

/** ShopRally pipeline stage labels — industry-standard shop terminology. */
export const JOB_BOARD_COLUMN_META: Record<
  BoardColumn,
  { title: string; subtitle: string }
> = {
  estimates: {
    title: "Estimates",
    subtitle: "Quotes awaiting authorization",
  },
  workInProgress: {
    title: "Work in Progress",
    subtitle: "Authorized jobs in the bay",
  },
  completed: {
    title: "Completed",
    subtitle: "Ready to invoice or collect",
  },
};

/** Column chrome classes — subtle brand accents (navy / light-blue / red). */
export const JOB_BOARD_COLUMN: Record<
  BoardColumn,
  { header: string; body: string; dropOver: string }
> = {
  estimates: {
    header: "job-board-col-header job-board-col-header-estimates",
    body: "job-board-col-body job-board-col-body-estimates",
    dropOver: "job-board-col-drop-estimates",
  },
  workInProgress: {
    header: "job-board-col-header job-board-col-header-wip",
    body: "job-board-col-body job-board-col-body-wip",
    dropOver: "job-board-col-drop-wip",
  },
  completed: {
    header: "job-board-col-header job-board-col-header-completed",
    body: "job-board-col-body job-board-col-body-completed",
    dropOver: "job-board-col-drop-completed",
  },
};

/** Sparse text cues — no bordered chips (keeps cards scannable). */
const CUE_BASE =
  "inline-flex max-w-full truncate text-[11px] font-medium leading-none tracking-[0.01em]";

export const JOB_BOARD_CONTEXT_CHIP = {
  paid: `${CUE_BASE} text-emerald-700`,
  approved: `${CUE_BASE} text-brand-navy/80`,
  pending: `${CUE_BASE} text-muted-foreground`,
  alert: `${CUE_BASE} text-brand-red`,
} as const;

const PILL_BASE =
  "job-board-card-status-pill inline-flex h-5 w-fit max-w-[9rem] shrink-0 items-center truncate rounded px-1.5 text-[10px] font-semibold leading-none tracking-[0.01em]";

/**
 * Primary card status pill — ShopRally navy / light-blue / red (never Tekmetric teal).
 * Small and calm so status → who → money stays the scan path.
 */
export const JOB_BOARD_CARD_STATUS_PILL = {
  notStarted: {
    label: "Not Started",
    className: `${PILL_BASE} bg-brand-navy text-white`,
  },
  inProgress: {
    label: "In Progress",
    className: `${PILL_BASE} bg-brand-navy/12 text-brand-navy`,
  },
  balanceDue: {
    label: "Balance Due",
    className: `${PILL_BASE} bg-brand-red text-white`,
  },
  paid: {
    label: "Paid",
    className: `${PILL_BASE} bg-emerald-700 text-white`,
  },
  completed: {
    label: "Completed",
    className: `${PILL_BASE} bg-emerald-700/10 text-emerald-800`,
  },
  approved: {
    label: "Approved",
    className: `${PILL_BASE} bg-brand-navy text-white`,
  },
} as const;

export type JobBoardCardStatusPillKey = keyof typeof JOB_BOARD_CARD_STATUS_PILL;

/** Legacy status pills — used outside job cards (dashboard widgets, list view). */
export const JOB_BOARD_STATUS_PILL: Record<
  ROStatus,
  { label: string; className: string }
> = {
  ESTIMATE: {
    label: "Estimate",
    className: `${PILL_BASE} bg-brand-navy text-white`,
  },
  APPROVED: {
    label: "Approved",
    className: `${PILL_BASE} bg-brand-light/35 text-brand-navy ring-1 ring-inset ring-brand-navy/15`,
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: `${PILL_BASE} bg-brand-light/35 text-brand-navy ring-1 ring-inset ring-brand-navy/15`,
  },
  COMPLETED: {
    label: "Completed",
    className: `${PILL_BASE} bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200`,
  },
  INVOICED: {
    label: "Invoiced",
    className: `${PILL_BASE} bg-emerald-600 text-white`,
  },
};

export function jobBoardCardClass(opts: {
  selected: boolean;
  auth: "customer" | "shop" | null;
  column?: BoardColumn;
  /** @deprecated Age tone is no longer used for card chrome. */
  tone?: "fresh" | "amber" | "stale" | "ready" | "neutral";
}): string {
  const parts = ["job-board-card"];
  if (opts.column) parts.push(`job-board-card-${opts.column}`);
  if (opts.selected) parts.push("job-board-card-selected");
  return parts.join(" ");
}
