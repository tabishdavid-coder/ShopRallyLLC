"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Plus, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CannedJobPickerSheet } from "@/components/repair-order/canned-job-picker-sheet";
import { addJob } from "@/server/actions/estimate";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";

/** Add Job control — blank job or canned template. */
export function EstimateAddJob({
  roId,
  cannedJobs,
  cannedJobCategories,
  baseRateCents,
  partTiers,
  laborTiers,
}: {
  roId: string;
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [pending, start] = useTransition();
  const [cannedOpen, setCannedOpen] = useState(false);

  function addBlank() {
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={pending} variant="outline" className="w-full gap-1.5 border-dashed">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add Job
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuItem onClick={addBlank} disabled={pending} className="gap-2">
            <Plus className="size-4" />
            Blank job
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setCannedOpen(true)}
            disabled={pending}
            className="gap-2"
          >
            <Star className="size-4 text-brand-navy" />
            From canned job
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
