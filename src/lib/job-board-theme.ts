import type { ROStatus } from "@/generated/prisma";

import type { BoardColumn } from "@/lib/job-board";

/**
 * ShopRally 3-column board — stage colors inspired by the Mac Auto mock
 * (blue → amber → green) without adopting the mock’s 6-column layout.
 */
export const JOB_BOARD_STAGE_COLOR: Record<
  BoardColumn,
  { cssVar: string; hex: string; label: string }
> = {
  estimates: { cssVar: "--jb-stage-estimates", hex: "#2f6fed", label: "Estimates" },
  workInProgress: { cssVar: "--jb-stage-wip", hex: "#e8a317", label: "In Progress" },
  completed: { cssVar: "--jb-stage-completed", hex: "#2f9e6b", label: "Completed" },
};

/** ShopRally pipeline stage labels — short mock-style captions. */
export const JOB_BOARD_COLUMN_META: Record<
  BoardColumn,
  { title: string; subtitle: string; ribbonLabel: string }
> = {
  estimates: {
    title: "Estimates",
    subtitle: "Build & send",
    ribbonLabel: "ESTIMATES",
  },
  workInProgress: {
    title: "Work in Progress",
    subtitle: "On the lift",
    ribbonLabel: "IN PROGRESS",
  },
  completed: {
    title: "Completed",
    subtitle: "Ready for pickup",
    ribbonLabel: "COMPLETED",
  },
};

/** Column chrome classes — colored top bar + soft tinted well. */
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

/** Soft status pills — mock-inspired, still ShopRally (no teal clone). */
const PILL_BASE =
  "job-board-card-status-pill inline-flex h-5 w-fit max-w-[10rem] shrink-0 items-center truncate rounded-md px-1.5 text-[10px] font-semibold leading-none tracking-[0.01em]";

export const JOB_BOARD_CARD_STATUS_PILL = {
  notStarted: {
    label: "Draft",
    className: `${PILL_BASE} bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80`,
  },
  inProgress: {
    label: "In bay",
    className: `${PILL_BASE} bg-[color-mix(in_oklab,var(--jb-stage-wip)_14%,white)] text-[color-mix(in_oklab,var(--jb-stage-wip)_85%,#3a2a00)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--jb-stage-wip)_28%,transparent)]`,
  },
  balanceDue: {
    label: "Balance due",
    className: `${PILL_BASE} bg-brand-red/10 text-brand-red ring-1 ring-inset ring-brand-red/25`,
  },
  paid: {
    label: "Paid",
    className: `${PILL_BASE} bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200`,
  },
  completed: {
    label: "Ready for pickup",
    className: `${PILL_BASE} bg-[color-mix(in_oklab,var(--jb-stage-completed)_12%,white)] text-[color-mix(in_oklab,var(--jb-stage-completed)_90%,#0a2a1a)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--jb-stage-completed)_28%,transparent)]`,
  },
  approved: {
    label: "Approved",
    className: `${PILL_BASE} bg-[color-mix(in_oklab,var(--jb-stage-estimates)_12%,white)] text-[color-mix(in_oklab,var(--jb-stage-estimates)_90%,#0a1a40)] ring-1 ring-inset ring-[color-mix(in_oklab,var(--jb-stage-estimates)_28%,transparent)]`,
  },
  sent: {
    label: "Sent",
    className: `${PILL_BASE} bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/90`,
  },
  viewed: {
    label: "Viewed",
    className: `${PILL_BASE} bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/90`,
  },
} as const;

export type JobBoardCardStatusPillKey = keyof typeof JOB_BOARD_CARD_STATUS_PILL;

/** Sparse text cues — secondary to the status pill. */
const CUE_BASE =
  "inline-flex max-w-full truncate text-[11px] font-medium leading-none tracking-[0.01em]";

export const JOB_BOARD_CONTEXT_CHIP = {
  paid: `${CUE_BASE} text-emerald-700`,
  approved: `${CUE_BASE} text-[color:var(--jb-stage-estimates)]`,
  pending: `${CUE_BASE} text-amber-700`,
  alert: `${CUE_BASE} text-brand-red`,
} as const;

/** Legacy status pills — used outside job cards (dashboard widgets, list view). */
export const JOB_BOARD_STATUS_PILL: Record<
  ROStatus,
  { label: string; className: string }
> = {
  ESTIMATE: {
    label: "Estimate",
    className: `${PILL_BASE} bg-[color-mix(in_oklab,var(--jb-stage-estimates)_14%,white)] text-[color-mix(in_oklab,var(--jb-stage-estimates)_90%,#0a1a40)]`,
  },
  APPROVED: {
    label: "Approved",
    className: `${PILL_BASE} bg-[color-mix(in_oklab,var(--jb-stage-estimates)_12%,white)] text-[color-mix(in_oklab,var(--jb-stage-estimates)_90%,#0a1a40)]`,
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: `${PILL_BASE} bg-[color-mix(in_oklab,var(--jb-stage-wip)_14%,white)] text-[color-mix(in_oklab,var(--jb-stage-wip)_85%,#3a2a00)]`,
  },
  COMPLETED: {
    label: "Completed",
    className: `${PILL_BASE} bg-[color-mix(in_oklab,var(--jb-stage-completed)_12%,white)] text-[color-mix(in_oklab,var(--jb-stage-completed)_90%,#0a2a1a)]`,
  },
  INVOICED: {
    label: "Invoiced",
    className: `${PILL_BASE} bg-slate-700 text-white`,
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

/** Progress step index 0–2 for the three ShopRally columns. */
export function jobBoardProgressStep(column?: BoardColumn): number {
  if (column === "workInProgress") return 1;
  if (column === "completed") return 2;
  return 0;
}
