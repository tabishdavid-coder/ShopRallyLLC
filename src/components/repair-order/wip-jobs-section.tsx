"use client";

import { useState } from "react";

import { EstimateJobsHeader } from "@/components/repair-order/estimate-jobs-header";
import { WipJobCard } from "@/components/repair-order/wip-job-card";
import type { RepairOrderDetail } from "@/server/repair-order";
import type { Technician } from "@/server/staff";

type Job = RepairOrderDetail["jobs"][number];

export function WipJobsSection({
  roId,
  jobs,
  taxBps,
  technicians,
  baseRateCents,
  roDone,
}: {
  roId: string;
  jobs: Job[];
  taxBps: number;
  technicians: Technician[];
  baseRateCents: number;
  roDone: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <EstimateJobsHeader collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <div className="space-y-3">
        {jobs.map((job, i) => (
          <WipJobCard
            key={job.id}
            roId={roId}
            index={i}
            job={job}
            taxBps={taxBps}
            technicians={technicians}
            baseRateCents={baseRateCents}
            roDone={roDone}
            forceCollapsed={collapsed}
          />
        ))}
      </div>
    </>
  );
}
