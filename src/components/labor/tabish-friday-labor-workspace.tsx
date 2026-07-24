"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  TabishFridayLaborVehicleGate,
  TabishFridayVehicleStrip,
  type TabishFridayVehicleContext,
} from "@/components/labor/tabish-friday-labor-vehicle-gate";
import { TabishFridayLaborFrame } from "@/components/labor/tabish-friday-labor-frame";
import type { QuickLaborVehicle } from "@/lib/quick-labor";
import { buildServiceTicketFromQuickLabor } from "@/lib/quick-labor-ro-prefill";
import { vehicleReadyForTabishFriday } from "@/lib/tabish-friday-labor";
import type { LaborCartLine } from "@/lib/labor-guide-types";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import { addLaborGuideJob } from "@/server/actions/labor-guide";

type GuideLine = Omit<LaborCartLine, "key">;

function initialContextFromVehicle(
  vehicle: QuickLaborVehicle | null | undefined,
): TabishFridayVehicleContext | null {
  if (!vehicleReadyForTabishFriday(vehicle) || !vehicle) return null;
  return {
    vehicle,
    decoded: {
      year: vehicle.year ?? null,
      make: vehicle.make ?? null,
      model: vehicle.model ?? null,
      trim: vehicle.trim ?? null,
      engine: vehicle.engine ?? null,
      drivetrain: vehicle.drivetrain ?? null,
      engineDetails: {},
      transmission: null,
      bodyClass: null,
      raw: null,
    },
    displayVin: vehicle.vin ?? null,
  };
}

/**
 * Decode gate + Tabish Friday Labor iframe workspace.
 * Used by Quick Labor and estimate Labor Lookup dialog.
 */
export function TabishFridayLaborWorkspace({
  initialVehicle,
  roId,
  requireGate = false,
  onAddLines,
  onJobCreated,
  className,
}: {
  /** Prefill from RO vehicle — skips gate when YMM/VIN present unless requireGate. */
  initialVehicle?: QuickLaborVehicle | null;
  roId?: string;
  /** Quick Labor always requires explicit decode even if initialVehicle passed. */
  requireGate?: boolean;
  onAddLines?: (lines: GuideLine[]) => void;
  onJobCreated?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const prefilled = useMemo(
    () => (requireGate ? null : initialContextFromVehicle(initialVehicle)),
    [initialVehicle, requireGate],
  );
  const [context, setContext] = useState<TabishFridayVehicleContext | null>(prefilled);

  const handleCreateJob = useCallback(
    async (lines: GuideLine[], jobName: string) => {
      if (!roId) return;
      const res = await addLaborGuideJob(roId, jobName, lines);
      if (res.ok) {
        toast("success", `Job "${jobName}" added from Tabish Friday Labor`);
        router.refresh();
        onJobCreated?.();
      } else {
        toast("error", res.error);
      }
    },
    [roId, router, onJobCreated, toast],
  );

  const handleQuickLaborTicket = useCallback(
    (lines: GuideLine[], jobName: string) => {
      if (!context?.vehicle) return;
      const concern =
        lines.map((l) => `${l.description}: ${l.hours.toFixed(2)} hr`).join(" · ") || jobName;
      const result = buildServiceTicketFromQuickLabor(context.vehicle, concern);
      if (result.ok) {
        router.push(result.href);
      } else {
        toast("error", result.error);
      }
    },
    [context?.vehicle, router, toast],
  );

  if (!context) {
    return (
      <TabishFridayLaborVehicleGate
        onIdentified={setContext}
        className={className}
      />
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className ?? ""}`}>
      <TabishFridayVehicleStrip context={context} onChange={() => setContext(null)} />
      <div className="min-h-0 flex-1">
        <TabishFridayLaborFrame
          vehicle={context.vehicle}
          roId={roId}
          onAddLines={onAddLines}
          onCreateJob={roId ? handleCreateJob : undefined}
          onQuickLaborTicket={roId ? undefined : handleQuickLaborTicket}
          className="min-h-[480px]"
        />
      </div>
    </div>
  );
}
