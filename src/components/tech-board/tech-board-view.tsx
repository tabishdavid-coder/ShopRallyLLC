"use client";

import Link from "next/link";
import { Gauge, User, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TechBoardColumn } from "@/server/tech-board";

export function TechBoardView({ columns }: { columns: TechBoardColumn[] }) {
  const unassigned = columns.find((c) => c.technicianId === null);
  const assigned = columns.filter((c) => c.technicianId !== null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {columns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-navy/20 py-16 text-muted-foreground">
          <Gauge className="size-10 stroke-[1.25] text-brand-navy/40" />
          <p className="text-sm">No active work in the shop right now.</p>
          <Link href="/job-board" className="text-sm font-medium text-brand-navy hover:underline">
            View Job Board
          </Link>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 overflow-x-auto pb-1 xl:grid-cols-[minmax(240px,1fr)_repeat(auto-fit,minmax(240px,1fr))]">
          {unassigned ? (
            <TechColumn column={unassigned} variant="unassigned" />
          ) : null}
          {assigned.map((col) => (
            <TechColumn key={col.technicianId!} column={col} />
          ))}
        </div>
      )}
    </div>
  );
}

function TechColumn({
  column,
  variant = "default",
}: {
  column: TechBoardColumn;
  variant?: "default" | "unassigned";
}) {
  const isUnassigned = variant === "unassigned";

  return (
    <div
      className={cn(
        "job-board-col flex min-h-0 min-w-[240px] flex-col",
        isUnassigned && "ring-1 ring-brand-red/25",
      )}
    >
      <div
        className={cn(
          "job-board-col-header flex shrink-0 flex-col gap-1",
          isUnassigned ? "job-board-col-header-estimates" : "job-board-col-header-wip",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <User className={cn("size-4 shrink-0", isUnassigned ? "text-brand-red" : "text-brand-navy")} />
            <h2 className="truncate font-semibold text-brand-navy">{column.technicianName}</h2>
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {column.jobs.length} jobs
          </Badge>
        </div>
        <p className="text-[10px] tabular-nums text-muted-foreground">
          {column.assignedHours.toFixed(1)}h assigned
          {column.completedHours > 0 ? ` · ${column.completedHours.toFixed(1)}h done` : null}
          {column.incompleteHours > 0 ? ` · ${column.incompleteHours.toFixed(1)}h open` : null}
        </p>
      </div>

      <ul className="min-h-0 flex-1 divide-y overflow-y-auto p-1.5">
        {column.jobs.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">No assigned jobs</li>
        ) : (
          column.jobs.map((job) => (
            <li key={job.jobId} className="rounded-md p-2 hover:bg-brand-light/15">
              <Link href={`/repair-orders/${job.roId}/work-in-progress`} className="block">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{job.jobName}</p>
                  <span className="shrink-0 text-xs font-bold text-brand-navy">RO#{job.roNumber}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{job.customerName}</p>
                <p className="truncate text-xs text-muted-foreground">{job.vehicleLabel}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {job.hours > 0 ? (
                    <span className="tabular-nums">{job.hours.toFixed(1)} labor hrs</span>
                  ) : null}
                  <Wrench className="size-3 text-brand-navy/50" aria-hidden />
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
