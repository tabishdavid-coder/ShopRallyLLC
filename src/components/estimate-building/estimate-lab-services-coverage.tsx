"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

import type { HubPart } from "@/lib/hub-parts";
import type { ServiceJobSummary } from "@/lib/service-job-parts";
import { cn } from "@/lib/utils";

export function EstimateLabServicesCoverage({
  jobs,
  parts,
  statusFilter,
}: {
  jobs: ServiceJobSummary[];
  parts: HubPart[];
  /** When set, only count parts in this pipeline status. */
  statusFilter?: HubPart["status"];
}) {
  const scopedParts = statusFilter ? parts.filter((p) => p.status === statusFilter) : parts;

  const rows = useMemo(
    () =>
      jobs.map((job) => {
        const assigned = scopedParts.filter((p) => p.jobId === job.id);
        return { job, assigned };
      }),
    [jobs, scopedParts],
  );

  const unassigned = scopedParts.filter((p) => !jobs.some((j) => j.id === p.jobId));
  const servicesNeedingParts = jobs.filter((j) => j.needsParts);
  const servicesMissingAssignment = jobs.filter(
    (j) => j.laborCount > 0 && !scopedParts.some((p) => p.jobId === j.id),
  );

  if (jobs.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Services on this estimate
        </p>
        {servicesMissingAssignment.length > 0 && statusFilter === "QUOTED" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-900">
            <AlertTriangle className="size-3" aria-hidden />
            {servicesMissingAssignment.length} service
            {servicesMissingAssignment.length === 1 ? "" : "s"} without quoted parts
          </span>
        ) : null}
      </div>
      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ job, assigned }) => (
          <li
            key={job.id}
            className={cn(
              "flex items-start justify-between gap-2 rounded-md border bg-white px-2 py-1.5 text-xs",
              job.needsParts && assigned.length === 0
                ? "border-amber-300/60"
                : "border-border/80",
            )}
          >
            <span className="min-w-0 font-medium text-foreground">{job.name}</span>
            <span className="shrink-0 text-right text-[10px] text-muted-foreground">
              {assigned.length > 0 ? (
                <>
                  {assigned.length} quoted
                  <span className="block truncate max-w-[8rem] text-foreground/70">
                    {assigned.map((p) => p.description).join(", ")}
                  </span>
                </>
              ) : job.needsParts ? (
                <span className="text-amber-800">needs parts</span>
              ) : job.partCount > 0 ? (
                `${job.partCount} on service`
              ) : (
                "no parts"
              )}
            </span>
          </li>
        ))}
      </ul>
      {servicesNeedingParts.length > 0 && scopedParts.length > 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Assign quoted vendor lines to a service above — they appear on the Services tab under that job.
        </p>
      ) : null}
      {unassigned.length > 0 ? (
        <p className="mt-1 text-[11px] text-destructive">
          {unassigned.length} part line{unassigned.length === 1 ? "" : "s"} not linked to a service.
        </p>
      ) : null}
    </div>
  );
}
