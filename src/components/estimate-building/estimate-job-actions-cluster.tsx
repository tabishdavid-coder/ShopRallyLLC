"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CannedJobPickerSheet } from "@/components/repair-order/canned-job-picker-sheet";
import { CreateJobAiTrigger } from "@/components/estimate-building/create-job-ai-trigger";
import { addJob } from "@/server/actions/estimate";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import { cn } from "@/lib/utils";

const NAVY_JOB_BTN = cn(
  "h-9 rounded-none bg-[#0B1F3B] px-3.5 text-sm font-medium shadow-none hover:bg-[#0B1F3B]/90",
);

const OUTLINE_BTN = cn(
  "h-9 gap-1.5 rounded-none border border-[#DDE5EF] bg-white px-3 text-sm font-medium text-[#0B1F3B] shadow-none",
  "hover:border-[#0B1F3B]/40 hover:bg-[#0B1F3B]/[0.04] hover:text-[#0B1F3B]",
  "[&>svg:first-child]:text-[#0B1F3B]",
);

/** Jobs header / toolbar action row: Canned jobs | + Job | Job with AI (left → right). */
export function EstimateJobActionsCluster({
  roId,
  cannedJobs,
  cannedJobCategories,
  baseRateCents,
  partTiers,
  laborTiers,
  className,
  jobButtonVariant = "primary",
  cannedLabel = "Canned jobs",
  jobLabel = "+ Job",
  aiLabel = "Job with AI",
}: {
  roId: string;
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  className?: string;
  /** Navy primary for + Job (header/empty) vs outline (toolbar). */
  jobButtonVariant?: "primary" | "outline";
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
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={OUTLINE_BTN}
          onClick={() => setCannedOpen(true)}
        >
          <Star className="size-4 text-brand-navy" aria-hidden />
          {cannedLabel}
        </Button>

        <Button
          type="button"
          size="sm"
          className={cn(
            jobButtonVariant === "primary"
              ? cn(NAVY_JOB_BTN, "text-white")
              : OUTLINE_BTN,
          )}
          onClick={addBlankJob}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {jobLabel}
        </Button>

        <CreateJobAiTrigger roId={roId} label={aiLabel} />
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
