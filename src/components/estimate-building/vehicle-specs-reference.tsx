"use client";

import { Droplets, Gauge, Loader2 } from "lucide-react";

import { VinDisplay } from "@/components/vin-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import type { MaintenanceSpecRow } from "@/lib/vehicle-maintenance-specs";
import { fluidEnrichSourceLabel } from "@/lib/vehicle-fluids-enrich";
import {
  vehicleCanShowSpecsUi,
  vehicleHasYmm,
  vehicleSpecsSourceKind,
  vehicleSpecsSourceLabel,
  vehicleYmmLabel,
} from "@/lib/vehicle-specs-view";
import { cn } from "@/lib/utils";
import type { VehicleSpecsEngineOption } from "@/server/actions/vehicle-specs";

/** Canonical Fluids / service-reference slots (AutoLeap modal + Tekmetric Fluids). */
const FLUID_REFERENCE_SLOTS: { key: string; label: string; memoryKeys: string[] }[] = [
  { key: "engineOil", label: "Engine oil", memoryKeys: ["engineOil"] },
  { key: "oilCapacity", label: "Oil capacity", memoryKeys: ["oilCapacity"] },
  { key: "coolant", label: "Coolant", memoryKeys: ["coolant"] },
  { key: "transFluid", label: "Transmission fluid", memoryKeys: ["transmissionFluid"] },
  { key: "brakeFluid", label: "Brake fluid", memoryKeys: ["brakeFluid"] },
  { key: "acRefrigerant", label: "A/C refrigerant", memoryKeys: ["acRefrigerant"] },
  { key: "battery", label: "Battery", memoryKeys: ["battery"] },
];

function memoryValue(
  rows: MaintenanceSpecRow[],
  keys: string[],
): { value: string | null; source: string | null; sourceNote?: string | null } {
  for (const key of keys) {
    const hit = rows.find((r) => r.key === key && r.value);
    if (hit?.value) {
      if (hit.source === "ai") {
        const label =
          hit.confidence != null
            ? fluidEnrichSourceLabel(hit.confidence)
            : "AI · suggested";
        return {
          value: hit.value,
          source: label,
          sourceNote: hit.sourceNote,
        };
      }
      return {
        value: hit.value,
        source: hit.source === "manual" ? "Advisor" : hit.source === "history" ? "Shop history" : null,
      };
    }
  }
  return { value: null, source: null };
}

function SourceChip({ kind }: { kind: ReturnType<typeof vehicleSpecsSourceKind> }) {
  const label = vehicleSpecsSourceLabel(kind);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        kind === "decoded" && "bg-brand-navy/10 text-brand-navy",
        kind === "catalog" && "bg-emerald-500/10 text-emerald-800",
        kind === "needs_engine" && "bg-amber-500/15 text-amber-900",
        kind === "entered" && "bg-slate-100 text-slate-600",
      )}
    >
      {label}
    </span>
  );
}

function IdentityRow({
  label,
  value,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3 border-b border-[color:var(--jb-line,#dde5ef)]/80 last:border-0",
        compact ? "py-1.5" : "py-2",
      )}
    >
      <span className="shrink-0 text-[12px] text-[var(--jb-slate,#5b7295)]">{label}</span>
      <span className="min-w-0 text-right text-[13px] font-medium text-[var(--jb-ink,#0b1f3b)]">
        {value}
      </span>
    </div>
  );
}

function FluidCard({
  label,
  value,
  source,
  sourceNote,
}: {
  label: string;
  value: string | null;
  source: string | null;
  sourceNote?: string | null;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-col rounded-md border px-3 py-2.5",
        value
          ? "border-[color:var(--jb-line,#dde5ef)] bg-white"
          : "border-dashed border-brand-navy/20 bg-slate-50/80",
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--jb-faint,#8ca2c0)]">
        {label}
      </div>
      {value ? (
        <>
          <div className="mt-1 text-sm font-medium leading-snug text-[var(--jb-ink,#0b1f3b)]">
            {value}
          </div>
          {source ? (
            <div className="mt-auto pt-1 text-[10px] text-muted-foreground">
              {source}
              {sourceNote ? ` · ${sourceNote}` : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-1 text-[12px] leading-snug text-muted-foreground">
          Not available yet
        </div>
      )}
    </div>
  );
}

function FluidsGrid({
  data,
  enriching = false,
  enrichNote = null,
}: {
  data: EstimateLabVehicleSpecsBundle;
  enriching?: boolean;
  enrichNote?: string | null;
}) {
  const fluidRows = [
    ...data.maintenanceMemory.fluids,
    ...data.maintenanceMemory.batteries,
  ];
  const hasAny = FLUID_REFERENCE_SLOTS.some(
    (slot) => memoryValue(fluidRows, slot.memoryKeys).value,
  );
  const ymmOk = vehicleHasYmm(data.specs);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
          <Droplets className="size-3.5 text-brand-navy" aria-hidden />
          Fluids &amp; service reference
        </div>
        {enriching ? (
          <span className="flex items-center gap-1.5 text-[11px] text-brand-navy">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Looking up fluids…
          </span>
        ) : !hasAny && ymmOk ? (
          <span className="text-[11px] text-muted-foreground">Loaded when you open Specs</span>
        ) : null}
      </div>
      {enrichNote ? (
        <p className="rounded-sm bg-brand-navy/5 px-2 py-1.5 text-[11px] leading-snug text-brand-navy">
          {enrichNote}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {FLUID_REFERENCE_SLOTS.map((slot) => {
          const { value, source, sourceNote } = memoryValue(fluidRows, slot.memoryKeys);
          return (
            <FluidCard
              key={slot.key}
              label={slot.label}
              value={value}
              source={source}
              sourceNote={sourceNote}
            />
          );
        })}
      </div>
      {!ymmOk ? (
        <p className="text-[12px] text-muted-foreground">
          Add year, make, and model on the vehicle to look up fluid specs. VIN improves accuracy
          but is optional.
        </p>
      ) : null}
    </div>
  );
}

function IdentityPanel({
  data,
  compact,
  engineOptions = [],
  refreshNote = null,
  applyingEngine = false,
  onPickEngine,
}: {
  data: EstimateLabVehicleSpecsBundle;
  compact?: boolean;
  engineOptions?: VehicleSpecsEngineOption[];
  refreshNote?: string | null;
  applyingEngine?: boolean;
  onPickEngine?: (epaVehicleId: string) => void | Promise<void>;
}) {
  const { specs } = data;
  const source = vehicleSpecsSourceKind(specs);
  const ymm = vehicleYmmLabel(specs);
  const showEnginePicker =
    Boolean(onPickEngine) && engineOptions.length > 0 && !specs.engine?.trim();

  return (
    <div className="space-y-1">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
            <Gauge className="size-3.5 text-brand-navy" aria-hidden />
            Vehicle
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-[var(--jb-ink,#0b1f3b)]">
            {ymm || "Vehicle not identified"}
          </p>
        </div>
        {vehicleCanShowSpecsUi(specs) ? <SourceChip kind={source} /> : null}
      </div>

      {refreshNote ? (
        <p className="mb-2 rounded-sm bg-brand-navy/5 px-2 py-1.5 text-[11px] leading-snug text-brand-navy">
          {refreshNote}
        </p>
      ) : null}

      {specs.vin ? (
        <IdentityRow
          compact={compact}
          label="VIN"
          value={<VinDisplay vin={specs.vin} className="text-[13px]" />}
        />
      ) : (
        <IdentityRow compact={compact} label="VIN" value="—" />
      )}

      {showEnginePicker ? (
        <div className="space-y-1.5 border-b border-[color:var(--jb-line,#dde5ef)]/80 py-2">
          <div className="text-[12px] text-[var(--jb-slate,#5b7295)]">Engine</div>
          <Select
            disabled={applyingEngine}
            onValueChange={(value) => {
              void onPickEngine?.(value);
            }}
          >
            <SelectTrigger className="h-9 rounded-none border-brand-navy/25 bg-white text-left text-[13px]">
              <SelectValue
                placeholder={
                  applyingEngine ? "Saving engine…" : "Select engine from catalog…"
                }
              />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {engineOptions.map((opt) => (
                <SelectItem key={opt.epaVehicleId} value={opt.epaVehicleId}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-snug text-amber-800/90">
            Pick the matching engine — we don&apos;t guess. Saves transmission / drive when
            available.
          </p>
          {applyingEngine ? (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Saving…
            </div>
          ) : null}
        </div>
      ) : (
        <IdentityRow compact={compact} label="Engine" value={specs.engine || "—"} />
      )}

      <IdentityRow compact={compact} label="Transmission" value={specs.transmission || "—"} />
      <IdentityRow compact={compact} label="Drivetrain" value={specs.drivetrain || "—"} />
      <IdentityRow compact={compact} label="Body" value={specs.bodyClass || "—"} />
      {(data.tireSizeFront ||
        data.tireSizeRear ||
        data.lastTireOrder?.tireSizeFront ||
        data.lastTireOrder?.tireSizeRear) && (
        <IdentityRow
          compact={compact}
          label="Tires"
          value={
            [data.tireSizeFront, data.tireSizeRear].filter(Boolean).join(" / ") ||
            [data.lastTireOrder?.tireSizeFront, data.lastTireOrder?.tireSizeRear]
              .filter(Boolean)
              .join(" / ") ||
            "—"
          }
        />
      )}

      {source === "needs_engine" && !showEnginePicker ? (
        <p className="pt-2 text-[11px] leading-snug text-amber-800/90">
          No catalog engines found for this year/make/model. Add a VIN and reopen Specs, or set
          engine on the vehicle.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Shared Vehicle Specs body — horizontal (dialog) or stacked (rail).
 * Identity always visible; Fluids use maintenance memory today + catalog slots.
 */
export function VehicleSpecsReferenceBody({
  data,
  layout = "dialog",
  engineOptions = [],
  refreshNote = null,
  applyingEngine = false,
  onPickEngine,
  enrichingFluids = false,
  fluidsEnrichNote = null,
}: {
  data: EstimateLabVehicleSpecsBundle;
  layout?: "dialog" | "rail";
  engineOptions?: VehicleSpecsEngineOption[];
  refreshNote?: string | null;
  applyingEngine?: boolean;
  onPickEngine?: (epaVehicleId: string) => void | Promise<void>;
  enrichingFluids?: boolean;
  fluidsEnrichNote?: string | null;
}) {
  const identity = (
    <IdentityPanel
      data={data}
      compact={layout === "rail"}
      engineOptions={engineOptions}
      refreshNote={refreshNote}
      applyingEngine={applyingEngine}
      onPickEngine={onPickEngine}
    />
  );

  if (layout === "rail") {
    return (
      <div className="space-y-4">
        {identity}
        <div className="border-t border-[color:var(--jb-line,#dde5ef)] pt-3">
          <FluidsGrid data={data} enriching={enrichingFluids} enrichNote={fluidsEnrichNote} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(240px,34%)_1fr]">
      <aside className="border-b border-[color:var(--jb-line,#dde5ef)] bg-slate-50/90 px-5 py-4 lg:border-b-0 lg:border-r">
        {identity}
      </aside>
      <div className="min-h-0 overflow-y-auto px-5 py-4">
        <FluidsGrid data={data} enriching={enrichingFluids} enrichNote={fluidsEnrichNote} />
      </div>
    </div>
  );
}
