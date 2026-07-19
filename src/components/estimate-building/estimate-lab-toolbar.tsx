"use client";

import { useState } from "react";

import { ListTree, Package, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstimateLabCannedBrowseSheet } from "@/components/estimate-building/estimate-lab-canned-browse-sheet";
import { EstimateLabCannedSearch } from "@/components/estimate-building/estimate-lab-canned-search";
import { EstimateJobActionsCluster } from "@/components/estimate-building/estimate-job-actions-cluster";
import { EstimateJobLauncher } from "@/components/estimate-building/estimate-job-launcher";
import { CreateJobAiTrigger } from "@/components/estimate-building/create-job-ai-trigger";
import { useEstimateLabLabor } from "@/components/estimate-building/estimate-lab-labor-provider";
import { useEstimateLabParts } from "@/components/estimate-building/estimate-lab-parts-provider";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import {
  useMotorLaborUiEnabled,
  usePartsTechUiEnabled,
} from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

/** ShopRally quote toolbar — search + differentiated action cluster (not competitor pill row). */

export function EstimateLabToolbar({
  roId,
  cannedJobs,
  cannedJobCategories,
  baseRateCents,
  partTiers,
  laborTiers,
  vehicleId,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
  canEdit,
}: {
  roId: string;
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  vehicleId: string;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
  canEdit: boolean;
}) {
  const [cannedOpen, setCannedOpen] = useState(false);
  const [browseQuery, setBrowseQuery] = useState("");
  const { openPartsMenu } = useEstimateLabParts();
  const { openLaborGuide } = useEstimateLabLabor();
  const motorLaborOk = useMotorLaborUiEnabled();
  const partsTechOk = usePartsTechUiEnabled();
  /** Core: Labor Book / Parts lookup / Pro job launchers are off — canned search only. */
  const showProActionCluster = motorLaborOk || partsTechOk;

  if (!canEdit) return null;

  function openBrowse(query = "") {
    setBrowseQuery(query.trim());
    setCannedOpen(true);
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#DDE5EF] bg-white px-3 py-2 sm:px-4">
      <div className="min-w-[12rem] flex-1">
        <EstimateLabCannedSearch
          roId={roId}
          jobs={cannedJobs}
          baseRateCents={baseRateCents}
          partTiers={partTiers}
          laborTiers={laborTiers}
          onBrowse={openBrowse}
        />
      </div>

      {showProActionCluster ? (
        <div
          className="flex shrink-0 flex-wrap items-center gap-2"
          role="group"
          aria-label="Quote actions"
        >
          {motorLaborOk ? (
            <button
              type="button"
              onClick={() => openLaborGuide()}
              title="Open Labor Book — search flat-rate operations for this vehicle"
              aria-label="Open Labor Book — search flat-rate operations for this vehicle"
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-none border border-[#DDE5EF] bg-white",
                "px-3 text-sm font-medium text-[#0B1F3B]",
                "transition-colors hover:border-[#E86A10]/50 hover:bg-[#E86A10]/[0.06]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E86A10]/40",
              )}
            >
              <ListTree className="size-4 shrink-0 text-[#E86A10]" aria-hidden />
              Labor Book
            </button>
          ) : null}

          <EstimateJobLauncher
            roId={roId}
            cannedJobs={cannedJobs}
            cannedJobCategories={cannedJobCategories}
            baseRateCents={baseRateCents}
            partTiers={partTiers}
            laborTiers={laborTiers}
            vehicleId={vehicleId}
            customerName={customerName}
            vehicleLabel={vehicleLabel}
            specLine={specLine}
            mileageIn={mileageIn}
            odometerNotWorking={odometerNotWorking}
            triggerLabel="Job"
            triggerIcon={<Plus className="size-4" aria-hidden />}
            triggerClassName={cn(
              "h-9 gap-1.5 rounded-none border border-[#DDE5EF] bg-white px-3 text-sm font-medium text-[#0B1F3B] shadow-none",
              "hover:border-[#0B1F3B]/40 hover:bg-[#0B1F3B]/[0.04] hover:text-[#0B1F3B]",
              "[&>svg:first-child]:text-[#0B1F3B]",
            )}
          />

          <CreateJobAiTrigger roId={roId} label="Job with AI" />

          <EstimateJobLauncher
            roId={roId}
            cannedJobs={cannedJobs}
            cannedJobCategories={cannedJobCategories}
            baseRateCents={baseRateCents}
            partTiers={partTiers}
            laborTiers={laborTiers}
            vehicleId={vehicleId}
            customerName={customerName}
            vehicleLabel={vehicleLabel}
            specLine={specLine}
            mileageIn={mileageIn}
            odometerNotWorking={odometerNotWorking}
            triggerLabel="+ Work line"
            triggerClassName={cn(
              "h-9 gap-1.5 rounded-none bg-[#0B1F3B] px-3.5 text-sm font-medium shadow-none hover:bg-[#0B1F3B]/90",
              "[&>svg:first-child]:text-white",
            )}
          />

          {partsTechOk ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-none border-[#DDE5EF] bg-white px-3 text-sm font-medium text-[#0B1F3B] shadow-none hover:border-[#1E7FE0]/50 hover:bg-[#1E7FE0]/[0.06] hover:text-[#0B1F3B]"
              onClick={() => openPartsMenu({ mode: "lookup" })}
              title="Parts lookup — pick supplier and search catalogs"
            >
              <Package className="size-4 text-[#1E7FE0]" aria-hidden />
              Parts lookup
            </Button>
          ) : null}
        </div>
      ) : (
        /* Core: no Labor Book / Parts lookup / Work line — canned + blank job + AI */
        <EstimateJobActionsCluster
          roId={roId}
          cannedJobs={cannedJobs}
          cannedJobCategories={cannedJobCategories}
          baseRateCents={baseRateCents}
          partTiers={partTiers}
          laborTiers={laborTiers}
        />
      )}

      <EstimateLabCannedBrowseSheet
        open={cannedOpen}
        onOpenChange={setCannedOpen}
        roId={roId}
        jobs={cannedJobs}
        baseRateCents={baseRateCents}
        partTiers={partTiers}
        laborTiers={laborTiers}
        initialQuery={browseQuery}
      />
    </div>
  );
}
