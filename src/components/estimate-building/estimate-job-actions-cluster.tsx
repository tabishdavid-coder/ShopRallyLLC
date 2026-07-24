"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CannedJobPickerSheet } from "@/components/repair-order/canned-job-picker-sheet";
import { CreateJobAiTrigger } from "@/components/estimate-building/create-job-ai-trigger";
import {
  estimateJobActionCannedButton,
  estimateJobActionGroupClass,
  estimateJobActionJobButton,
} from "@/components/estimate-building/estimate-job-action-styles";
import { addJob } from "@/server/actions/estimate";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import { cn } from "@/lib/utils";

/**
 * Jobs header / toolbar action row: Canned jobs | Job | Job with AI (left → right).
 * Canned jobs opens CannedJobPickerSheet → live shop catalog (prisma.CannedJob / /canned-jobs).
 */
export function EstimateJobActionsCluster({
  roId,
  cannedJobs,
  cannedJobCategories,
  baseRateCents,
  partTiers,
  laborTiers,
  className,
  cannedLabel = "Canned jobs",
  jobLabel = "Job",
  aiLabel = "Job with AI",
}: {
  roId: string;
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  className?: string;
  cannedLabel?: string;
  jobLabel?: string;
  aiLabel?: string;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [cannedOpen, setCannedOpen] = useState(false);
  const [pending, start] = useTransition();

  function addBlankJob() {
    start(async () => {
      const res = await addJob(roId);
      if (res.ok) {
        toast("success", "Blank job added");
        router.refresh();
      } else {
        toast("error", res.error);
      }
    });
  }

  return (
    <>
      <div
        className={cn(estimateJobActionGroupClass, className)}
        role="group"
        aria-label="Add job"
      >
        <Button
          type="button"
          variant="outline"
          size="lg"
          className={estimateJobActionCannedButton}
          onClick={() => setCannedOpen(true)}
        >
          <Star className="size-4 shrink-0" aria-hidden />
          {cannedLabel}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className={estimateJobActionJobButton}
          onClick={addBlankJob}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4 shrink-0" aria-hidden />
          )}
          {jobLabel}
        </Button>

        <CreateJobAiTrigger
          roId={roId}
          label={aiLabel}
          appearance="cluster"
        />
      </div>

      <CannedJobPickerSheet
        open={cannedOpen}
        onOpenChange={setCannedOpen}
        roId={roId}
        jobs={cannedJobs}
        categories={cannedJobCategories}
        baseRateCents={baseRateCents}
        partTiers={partTiers}
        laborTiers={laborTiers}
      />
    </>
  );
}
