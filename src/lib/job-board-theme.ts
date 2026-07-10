import type { ROStatus } from "@/generated/prisma";

import type { BoardColumn } from "@/lib/job-board";

  /** ShopRally pipeline stage labels — industry-standard shop terminology. */
export const JOB_BOARD_COLUMN_META: Record<
  BoardColumn,
  { title: string; subtitle: string }
> = {
  estimates: {
    title: "ESTIMATES",
    subtitle: "Quotes awaiting customer or shop authorization",
  },
  workInProgress: {
    title: "WORK IN PROGRESS",
    subtitle: "Authorized jobs actively in the bay",
  },
  completed: {
    title: "COMPLETED",
    subtitle: "Ready to invoice or collect payment",
  },
};

/** Branded column chrome — Palette C accents (orange / azure / green). */
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

/** Rectangular status chips — mock STATUS_STYLE (wait / ok / paid / due). */
const CHIP_BASE =
  "inline-flex h-5 w-fit max-w-full shrink-0 items-center gap-1 truncate rounded-none border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em] leading-none";

/** Primary context chips — one per card, priority-ordered in job-card.tsx. */
export const JOB_BOARD_CONTEXT_CHIP = {
  paid: `${CHIP_BASE} border-[#B7E2CB] bg-[#E4F5EC] text-[#137347]`,
  approved: `${CHIP_BASE} border-[#BCD9F5] bg-[#E7F1FD] text-[#0F5FB0]`,
  pending: `${CHIP_BASE} border-[#F0CFA4] bg-[#FDF0E2] text-[#9A5200]`,
  alert: `${CHIP_BASE} border-[#EFC2C2] bg-[#FBEAEA] text-[#A32626]`,
} as const;

/** Legacy status pills — used outside job cards (dashboard widgets, etc.). */
const PILL_BASE =
  "inline-flex h-5 w-fit shrink-0 items-center rounded-none border px-2 py-0.5 text-[10px] font-semibold";

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
  /** @deprecated AgeDot uses its own class; top accent bar is column-driven. */
  tone?: "fresh" | "amber" | "stale" | "ready" | "neutral";
}): string {
  const parts = ["job-board-card"];
  if (opts.column) parts.push(`job-board-card-${opts.column}`);
  if (opts.selected) parts.push("job-board-card-selected");
  return parts.join(" ");
}
