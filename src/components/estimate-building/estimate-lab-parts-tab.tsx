"use client";

import { useMemo } from "react";

import { useEstimateLabParts } from "@/components/estimate-building/estimate-lab-parts-provider";
import { EstimateLabPartsPipeline } from "@/components/estimate-building/estimate-lab-parts-pipeline";
import { EstimateLabPartsVendorStrip } from "@/components/estimate-building/estimate-lab-parts-vendor-strip";
import type { IntegrationConnectionState } from "@/lib/integrations";

export function EstimateLabPartsTab({
  canEdit,
  partstechState,
  weldonState,
}: {
  canEdit: boolean;
  partstechState: IntegrationConnectionState;
  weldonState: IntegrationConnectionState;
}) {
  const { openPartsMenu, jobs, hubParts } = useEstimateLabParts();
  const noJobs = jobs.length === 0;

  const defaultTab = useMemo(() => {
    if (hubParts.some((p) => p.status === "QUOTED")) return "QUOTED" as const;
    if (hubParts.some((p) => p.status === "NEEDED")) return "NEEDED" as const;
    return "NEEDED" as const;
  }, [hubParts]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <header className="shrink-0">
        <h3 className="text-sm font-semibold text-brand-navy">Parts ordering</h3>
        <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground">
          Pick a vendor, build the order, then set <strong className="font-medium text-foreground">Service</strong> on
          each line so parts land on the right job in Services.
        </p>
      </header>

      {noJobs ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Add a service job on the Services tab first — every part line must attach to a service.
        </p>
      ) : (
        <>
          <EstimateLabPartsVendorStrip
            canEdit={canEdit}
            partstechState={partstechState}
            weldonState={weldonState}
            onManualOrder={() => openPartsMenu({ mode: "manual" })}
            onPartsLookup={() => openPartsMenu({ mode: "lookup" })}
          />

          <EstimateLabPartsPipeline
            parts={hubParts}
            jobs={jobs}
            canEdit={canEdit}
            defaultTab={defaultTab}
            layout="autoleap"
          />
        </>
      )}
    </div>
  );
}
