import type { InspectionItemStatus, InspectionStatus } from "@/generated/prisma";

/** Client-safe inspection item status values (mirrors Prisma enum). */
export const INSPECTION_ITEM_STATUS = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
  NA: "NA",
} as const satisfies Record<string, InspectionItemStatus>;

/** Client-safe inspection workflow status values. */
export const INSPECTION_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const satisfies Record<string, InspectionStatus>;

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

/** Row action label on RO inspection lists (Start / Continue / View). */
export function inspectionRowActionLabel(
  status: InspectionStatus,
  options?: { ratedCount?: number },
): string {
  if (status === INSPECTION_STATUS.COMPLETED) return "View";
  const rated = options?.ratedCount ?? 0;
  if (status === INSPECTION_STATUS.IN_PROGRESS || rated > 0) return "Continue";
  return "Start";
}

export function inspectionRowActionIsPrimary(
  status: InspectionStatus,
  options?: { ratedCount?: number },
): boolean {
  return inspectionRowActionLabel(status, options) === "Start";
}

/** RO inspection list rows hide the badge when only Start is shown. */
export function inspectionRowShowWorkflowBadge(
  status: InspectionStatus,
  options?: { ratedCount?: number },
): boolean {
  if (status === INSPECTION_STATUS.NOT_STARTED) {
    return (options?.ratedCount ?? 0) > 0;
  }
  return true;
}

/** Workflow badge for RO inspection list rows (status + optional percent label). */
export function inspectionRowWorkflowBadge(
  status: InspectionStatus,
  options?: { ratedCount?: number; itemCount?: number },
): { status: InspectionStatus; label: string } | null {
  if (!inspectionRowShowWorkflowBadge(status, options)) return null;

  if (status === INSPECTION_STATUS.COMPLETED) {
    return { status, label: INSPECTION_STATUS_LABELS.COMPLETED };
  }

  const rated = options?.ratedCount ?? 0;
  const total = options?.itemCount ?? 0;
  const partial = total > 0 && rated > 0 && rated < total;
  const label = partial
    ? `${Math.round((rated / total) * 100)}%`
    : INSPECTION_STATUS_LABELS.IN_PROGRESS;

  return { status: INSPECTION_STATUS.IN_PROGRESS, label };
}

export const INSPECTION_ITEM_STATUS_LABELS: Record<InspectionItemStatus, string> = {
  GREEN: "Pass",
  YELLOW: "Monitor",
  RED: "Fail",
  NA: "Not rated",
};

/** Semantic R/Y/G colors for inspection items. */
export const INSPECTION_STATUS_DOT: Record<InspectionItemStatus, string> = {
  GREEN: "bg-emerald-500",
  YELLOW: "bg-amber-500",
  RED: "bg-rose-500",
  NA: "bg-slate-300",
};

export const INSPECTION_STATUS_PILL: Record<InspectionItemStatus, string> = {
  GREEN: "bg-emerald-500/15 text-emerald-800 border-emerald-500/30",
  YELLOW: "bg-amber-500/15 text-amber-900 border-amber-500/30",
  RED: "bg-rose-500/15 text-rose-800 border-rose-500/30",
  NA: "bg-slate-100 text-slate-600 border-slate-200",
};

export const INSPECTION_STATUS_TOGGLE: Record<
  InspectionItemStatus,
  { active: string; idle: string }
> = {
  GREEN: {
    active: "bg-emerald-500 text-white border-emerald-600 shadow-sm",
    idle: "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10",
  },
  YELLOW: {
    active: "bg-amber-500 text-white border-amber-600 shadow-sm",
    idle: "border-amber-500/40 text-amber-800 hover:bg-amber-500/10",
  },
  RED: {
    active: "bg-rose-500 text-white border-rose-600 shadow-sm",
    idle: "border-rose-500/40 text-rose-700 hover:bg-rose-500/10",
  },
  NA: {
    active: "bg-slate-400 text-white border-slate-500",
    idle: "border-slate-300 text-slate-500 hover:bg-slate-100",
  },
};

export type InspectionProgress = {
  rated: number;
  total: number;
  percent: number;
  counts: Record<InspectionItemStatus, number>;
};

export function inspectionProgress(
  items: { status: InspectionItemStatus }[],
): InspectionProgress {
  const total = items.length;
  const counts: Record<InspectionItemStatus, number> = {
    GREEN: 0,
    YELLOW: 0,
    RED: 0,
    NA: 0,
  };
  for (const item of items) counts[item.status] += 1;
  const rated = total - counts.NA;
  const percent = total === 0 ? 0 : Math.round((rated / total) * 100);
  return { rated, total, percent, counts };
}

/** Derive workflow status from item ratings (unless manually completed). */
export function deriveInspectionStatus(
  items: { status: InspectionItemStatus }[],
): InspectionStatus {
  if (items.length === 0) return INSPECTION_STATUS.NOT_STARTED;
  const { rated, total } = inspectionProgress(items);
  if (rated === 0) return INSPECTION_STATUS.NOT_STARTED;
  if (rated < total) return INSPECTION_STATUS.IN_PROGRESS;
  return INSPECTION_STATUS.IN_PROGRESS;
}

export function groupInspectionItems<T extends { category: string | null; sortOrder: number }>(
  items: T[],
): { category: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const cat = item.category?.trim() || "General";
    const list = map.get(cat) ?? [];
    list.push(item);
    map.set(cat, list);
  }
  return Array.from(map.entries()).map(([category, group]) => ({
    category,
    items: group.sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
