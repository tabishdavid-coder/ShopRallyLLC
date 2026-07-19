"use client";

/**
 * Cost rule: Vehicle Specs metered enrich is on-demand only.
 * - Rail always shows lightweight identity from RO vehicle props (no API).
 * - Fluids / VIN decode / EPA / Gemini run only when Specs opens (dialog).
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Info, Loader2 } from "lucide-react";

import { EstimateLabVehicleSpecsDialog } from "@/components/estimate-building/estimate-lab-vehicle-specs-dialog";
import { useEstimateLabContextDrawerOptional } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { useVehicleSpecsUiEnabled } from "@/lib/shop-capabilities";
import { VEHICLE_SPECS_OPEN_EVENT } from "@/lib/vehicle-specs-open";
import {
  vehicleSpecsSourceKind,
  vehicleSpecsSourceLabel,
  vehicleYmmLabel,
  type VehicleSpecsView,
} from "@/lib/vehicle-specs-view";
import { cn } from "@/lib/utils";
import {
  applySpecsEngineChoice,
  openVehicleSpecsSession,
  type VehicleSpecsEngineOption,
} from "@/server/actions/vehicle-specs";

const RAIL_CARD =
  "rounded-none border-[1.5px] border-[var(--jb-line,#dde5ef)] bg-[var(--jb-card,#ffffff)] shadow-[0_1px_2px_rgba(11,31,59,0.05)]";

export type VehicleSpecsIdentitySummary = {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  bodyClass?: string | null;
};

function toView(summary: VehicleSpecsIdentitySummary): VehicleSpecsView {
  return {
    vin: summary.vin ?? null,
    year: summary.year ?? null,
    make: summary.make ?? null,
    model: summary.model ?? null,
    trim: summary.trim ?? null,
    engine: summary.engine ?? null,
    engineDetails: {
      displacementL: null,
      cylinders: null,
      configuration: null,
      fuelType: null,
      aspiration: null,
      horsepower: null,
    },
    engineRows: [],
    transmission: summary.transmission ?? null,
    drivetrain: summary.drivetrain ?? null,
    bodyClass: summary.bodyClass ?? null,
  };
}

export function EstimateLabVehicleSpecsLazy({
  vehicleId,
  excludeRoId,
  canEdit,
  identitySummary = null,
  className,
}: {
  vehicleId: string;
  excludeRoId?: string;
  canEdit?: boolean;
  /** Always-visible rail identity — from RO vehicle row, no Specs API. */
  identitySummary?: VehicleSpecsIdentitySummary | null;
  className?: string;
}) {
  const router = useRouter();
  const ctx = useEstimateLabContextDrawerOptional();
  const vehicleSpecsOk = useVehicleSpecsUiEnabled();
  const [open, setOpen] = useState(false);
  const [fluidsOpen, setFluidsOpen] = useState(false);
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

  useEffect(() => {
    if (!vehicleSpecsOk) return;
    const onOpen = () => openSpecs();
    window.addEventListener(VEHICLE_SPECS_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(VEHICLE_SPECS_OPEN_EVENT, onOpen);
  }, [vehicleSpecsOk, openSpecs]);

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
    [vehicleId, applyingEngine, router, loadFresh],
  );

  if (!vehicleSpecsOk) return null;

  const view = identitySummary ? toView(identitySummary) : data?.specs ?? null;
  const ymm = view ? vehicleYmmLabel(view) : "";
  const source = view ? vehicleSpecsSourceKind(view) : null;

  return (
    <>
      <div
        id="estimate-lab-vehicle-specs"
        className={cn(RAIL_CARD, "overflow-hidden", className)}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--jb-line,#dde5ef)] px-3.5 py-2">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
            Vehicle
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 gap-1 rounded-none border-brand-navy/25 bg-white px-2 text-[11px] font-medium text-brand-navy shadow-none hover:bg-brand-navy/5"
            onClick={openSpecs}
            disabled={pending && open}
          >
            {pending && open ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <Info className="size-3 text-brand-red" aria-hidden />
            )}
            Specs
          </Button>
        </div>

        <div className="space-y-1 px-3.5 py-2.5 text-[13px]">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="min-w-0 font-semibold leading-snug text-[var(--jb-ink,#0b1f3b)]">
              {ymm || "Add year / make / model"}
            </p>
            {source ? (
              <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {vehicleSpecsSourceLabel(source)}
              </span>
            ) : null}
          </div>
          {view?.engine ? (
            <p className="text-[12px] text-[var(--jb-slate,#5b7295)]">{view.engine}</p>
          ) : (
            <p className="text-[12px] text-amber-800/90">Needs engine — open Specs to pick</p>
          )}
          {view?.vin ? (
            <p className="truncate font-mono text-[11px] text-[var(--jb-slate,#5b7295)]">
              VIN {view.vin}
            </p>
          ) : (
            <p className="text-[11px] text-[var(--jb-faint,#8ca2c0)]">VIN —</p>
          )}
        </div>

        <Collapsible open={fluidsOpen} onOpenChange={setFluidsOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1.5 border-t border-[var(--jb-line,#dde5ef)] px-3.5 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)] hover:bg-slate-50">
            {fluidsOpen ? (
              <ChevronDown className="size-3.5 text-brand-navy" />
            ) : (
              <ChevronRight className="size-3.5 text-muted-foreground" />
            )}
            Fluids
            <span className="ml-auto text-[10px] font-semibold normal-case tracking-normal text-[var(--jb-faint,#8ca2c0)]">
              Open Specs to load
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-[var(--jb-line,#dde5ef)] px-3.5 py-2.5 text-[12px] text-[var(--jb-slate,#5b7295)]">
            <p className="leading-snug">
              Fluids &amp; service reference load when you open Specs (on demand). No catalog or AI
              calls until then.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-8 rounded-none border-brand-navy/25 text-xs text-brand-navy"
              onClick={openSpecs}
            >
              Open Specs
            </Button>
          </CollapsibleContent>
        </Collapsible>

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
