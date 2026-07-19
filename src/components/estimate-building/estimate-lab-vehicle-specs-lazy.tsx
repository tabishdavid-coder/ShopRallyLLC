"use client";

/**
 * Cost rule: Vehicle Specs are on-demand only.
 * - No catalog / EPA / NHTSA recalls / Gemini pulls on estimate page load.
 * - Fresh DB load (+ optional VIN decode / EPA engine list) only when Specs opens.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2 } from "lucide-react";

import { EstimateLabVehicleSpecsDialog } from "@/components/estimate-building/estimate-lab-vehicle-specs-dialog";
import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import { Button } from "@/components/ui/button";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { useVehicleSpecsUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";
import {
  applySpecsEngineChoice,
  openVehicleSpecsSession,
  type VehicleSpecsEngineOption,
} from "@/server/actions/vehicle-specs";

const RAIL_CARD =
  "rounded-none border-[1.5px] border-[var(--jb-line,#dde5ef)] bg-[var(--jb-card,#ffffff)] shadow-[0_1px_2px_rgba(11,31,59,0.05)]";

export function EstimateLabVehicleSpecsLazy({
  vehicleId,
  excludeRoId,
  canEdit,
  className,
}: {
  vehicleId: string;
  excludeRoId?: string;
  canEdit?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const ctx = useEstimateLabContextDrawerOptional();
  const vehicleSpecsOk = useVehicleSpecsUiEnabled();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EstimateLabVehicleSpecsBundle | null>(null);
  const [engineOptions, setEngineOptions] = useState<VehicleSpecsEngineOption[]>([]);
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [fluidsEnrichNote, setFluidsEnrichNote] = useState<string | null>(null);
  const [applyingEngine, setApplyingEngine] = useState(false);

  const loadFresh = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const res = await openVehicleSpecsSession(vehicleId, { excludeRoId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setData(res.data);
      setEngineOptions(res.engineOptions);
      setRefreshNote(res.refreshNote);
      setFluidsEnrichNote(res.fluidsEnrichNote);
      if (res.refreshNote?.includes("decoded")) {
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }, [vehicleId, excludeRoId, router]);

  const openSpecs = useCallback(() => {
    setOpen(true);
    void loadFresh();
  }, [loadFresh]);

  useEffect(() => {
    if (!ctx || !vehicleSpecsOk) return;
    ctx.registerOpenVehicleSpecs(openSpecs);
    return () => ctx.registerOpenVehicleSpecs(null);
  }, [ctx, vehicleSpecsOk, openSpecs]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) void loadFresh();
    },
    [loadFresh],
  );

  const onPickEngine = useCallback(
    async (epaVehicleId: string) => {
      if (!epaVehicleId || applyingEngine) return;
      setApplyingEngine(true);
      setError(null);
      try {
        const res = await applySpecsEngineChoice(vehicleId, epaVehicleId);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setEngineOptions([]);
        setRefreshNote("Engine saved from catalog.");
        await loadFresh();
        router.refresh();
      } finally {
        setApplyingEngine(false);
      }
    },
    [vehicleId, applyingEngine, router],
  );

  if (!vehicleSpecsOk) return null;

  return (
    <>
      <div
        id="estimate-lab-vehicle-specs"
        className={cn(RAIL_CARD, "overflow-hidden", className)}
      >
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
          <div className="min-w-0">
            <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
              Vehicle specs
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-[var(--jb-slate,#5b7295)]">
              Fluids &amp; identity — reloads when you open Specs
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 rounded-none border-brand-navy/25 bg-white px-2.5 text-xs font-medium text-brand-navy shadow-none hover:bg-brand-navy/5"
            onClick={openSpecs}
            disabled={pending && open}
          >
            {pending && open ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Info className="size-3.5 text-brand-red" aria-hidden />
            )}
            Specs
          </Button>
        </div>
        {error && !open ? (
          <p className="border-t border-[var(--jb-line,#dde5ef)] px-3.5 py-2 text-[11px] text-brand-red">
            {error}
          </p>
        ) : null}
      </div>

      <EstimateLabVehicleSpecsDialog
        data={data}
        canEdit={canEdit}
        open={open}
        onOpenChange={onOpenChange}
        showTrigger={false}
        loading={pending && !data}
        loadError={error}
        engineOptions={engineOptions}
        refreshNote={refreshNote}
        fluidsEnrichNote={fluidsEnrichNote}
        enrichingFluids={pending && open}
        applyingEngine={applyingEngine}
        onPickEngine={canEdit ? onPickEngine : undefined}
      />
    </>
  );
}
