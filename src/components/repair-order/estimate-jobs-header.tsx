"use client";

import Link from "next/link";
import { ArrowUpDown, FolderPlus, Settings2, Users, ChevronsDownUp } from "lucide-react";
import type { EstimateJobsLayout } from "@/generated/prisma";
import { ESTIMATE_JOBS_LAYOUT_LABELS } from "@/lib/estimate-jobs-layout";
import { cn } from "@/lib/utils";

export function EstimateJobsHeader({
  collapsed,
  onToggleCollapse,
  variant = "default",
  jobsReorderable = false,
  settingsHref,
  jobsLayout,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  variant?: "default" | "lab";
  /** Lab — jobs can be reordered via header grip handles. */
  jobsReorderable?: boolean;
  settingsHref?: string;
  jobsLayout?: EstimateJobsLayout;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-300/80 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jobs</span>
        {jobsLayout ? (
          <span className="truncate rounded border border-border/80 bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {ESTIMATE_JOBS_LAYOUT_LABELS[jobsLayout]}
          </span>
        ) : null}
      </div>
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
    </div>
  );
}
