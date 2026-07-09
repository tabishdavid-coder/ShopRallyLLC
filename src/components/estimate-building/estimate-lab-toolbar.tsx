"use client";

import { useState } from "react";

import { ListTree, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EstimateLabCannedBrowseSheet } from "@/components/estimate-building/estimate-lab-canned-browse-sheet";
import { EstimateLabCannedSearch } from "@/components/estimate-building/estimate-lab-canned-search";
import { EstimateJobLauncher } from "@/components/estimate-building/estimate-job-launcher";
import { useEstimateLabLabor } from "@/components/estimate-building/estimate-lab-labor-provider";
import { useEstimateLabParts } from "@/components/estimate-building/estimate-lab-parts-provider";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import { cn } from "@/lib/utils";

/** Karvio quote toolbar — search + differentiated action cluster (not competitor pill row). */

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

  if (!canEdit) return null;

  function openBrowse(query = "") {
    setBrowseQuery(query.trim());
    setCannedOpen(true);
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200/80 bg-slate-50/80 px-3 py-2.5 sm:px-4">
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

      <div
        className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-2.5"
        role="group"
        aria-label="Quote actions"
      >
        <button
          type="button"
          onClick={() => openLaborGuide()}
          title="Open Labor Book — search flat-rate operations for this vehicle"
          aria-label="Open Labor Book — search flat-rate operations for this vehicle"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200/90 bg-white",
            "border-l-2 border-l-brand-orange pl-2 pr-2.5 text-xs font-medium text-brand-navy shadow-sm",
            "transition-colors hover:border-slate-300 hover:bg-slate-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40",
          )}
        >
          <ListTree className="size-3.5 shrink-0 text-brand-orange/90" aria-hidden />
          Labor Book
        </button>

        <div className="hidden h-6 w-px shrink-0 bg-brand-navy/15 sm:block" aria-hidden />

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
            "h-8 gap-1.5 rounded-md px-3.5 text-sm shadow-sm",
            "[&>svg:first-child]:text-brand-red",
          )}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-brand-navy/30 bg-white text-brand-navy hover:border-brand-navy/45 hover:bg-brand-navy/[0.04]"
          onClick={() => openPartsMenu({ mode: "lookup" })}
          title="Parts lookup — pick supplier and search catalogs"
        >
          <Package className="size-3.5" aria-hidden />
          Parts lookup
        </Button>
      </div>

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
