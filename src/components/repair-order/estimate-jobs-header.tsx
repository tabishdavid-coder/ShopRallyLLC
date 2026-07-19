"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpDown, Check, FolderPlus, Settings2, Users, ChevronsDownUp } from "lucide-react";
import type { EstimateJobsLayout } from "@/generated/prisma";
import { ESTIMATE_JOBS_LAYOUT_LABELS } from "@/lib/estimate-jobs-layout";
import { cn } from "@/lib/utils";

function formatApprovedAt(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EstimateJobsHeader({
  collapsed,
  onToggleCollapse,
  variant = "default",
  jobsReorderable = false,
  settingsHref,
  jobsLayout,
  approvedAt,
  showHeaderControls = true,
  headerAction,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  variant?: "default" | "lab";
  /** Lab — jobs can be reordered via header grip handles. */
  jobsReorderable?: boolean;
  settingsHref?: string;
  jobsLayout?: EstimateJobsLayout;
  /** RO-level approval timestamp — shows a green Approved badge with timing when set. */
  approvedAt?: Date | string | null;
  /** When false, hides secondary toolbar controls (estimate workspace uses + Job only). */
  showHeaderControls?: boolean;
  /** Optional primary action rendered on the right (e.g. + Job launcher). */
  headerAction?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#DDE5EF] pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jobs</span>
        {showHeaderControls && jobsLayout ? (
          <span className="truncate rounded border border-border/80 bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {ESTIMATE_JOBS_LAYOUT_LABELS[jobsLayout]}
          </span>
        ) : null}
        {approvedAt ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-none border border-[#B7E2CB] bg-[#E4F5EC] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#137347]"
            role="status"
            title={`Approved ${formatApprovedAt(approvedAt)}`}
          >
            <Check className="size-3" aria-hidden />
            Approved · {formatApprovedAt(approvedAt)}
          </span>
        ) : null}
      </div>
      {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      {showHeaderControls && !headerAction ? (
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-subtle-foreground sm:gap-4">
          {variant === "lab" ? (
            <button
              type="button"
              disabled
              title="Add category — coming soon"
              className="flex cursor-not-allowed items-center gap-1 opacity-50"
            >
              <FolderPlus className="size-3.5" /> Add category
            </button>
          ) : null}
          <button
            type="button"
            disabled={!jobsReorderable}
            title={jobsReorderable ? "Drag job cards by the grip handle to reorder" : "Reorder jobs — enable edit mode"}
            className={cn(
              "flex items-center gap-1",
              jobsReorderable ? "text-foreground/70 hover:text-brand-navy" : "cursor-not-allowed opacity-50",
            )}
          >
            <ArrowUpDown className="size-3.5" /> {variant === "lab" ? "Reorder jobs" : "Sort jobs"}
          </button>
          <button
            type="button"
            disabled
            title="Assign technician and parts — coming soon"
            className="flex cursor-not-allowed items-center gap-1 opacity-50"
          >
            <Users className="size-3.5" /> Assign work
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-1 text-foreground/70 hover:text-brand-navy"
          >
            <ChevronsDownUp className="size-3.5" /> {collapsed ? "Expand all" : "Collapse all"}
          </button>
          {settingsHref ? (
            <Link
              href={settingsHref}
              className="flex items-center gap-1 text-foreground/70 hover:text-brand-navy"
              title="Estimate workspace layout settings"
            >
              <Settings2 className="size-3.5" /> Layout
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
