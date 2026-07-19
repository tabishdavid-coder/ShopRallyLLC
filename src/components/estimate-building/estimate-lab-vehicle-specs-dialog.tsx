"use client";

import { Info, Loader2 } from "lucide-react";

import { VehicleSpecsReferenceBody } from "@/components/estimate-building/vehicle-specs-reference";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { vehicleYmmLabel } from "@/lib/vehicle-specs-view";
import { cn } from "@/lib/utils";
import type { VehicleSpecsEngineOption } from "@/server/actions/vehicle-specs";

/** AutoLeap-style access: Specs button → wide dialog. Fresh load on every open. */
export function EstimateLabVehicleSpecsDialog({
  data,
  canEdit: _canEdit,
  className,
  open,
  onOpenChange,
  showTrigger = true,
  loading = false,
  loadError = null,
  engineOptions = [],
  refreshNote = null,
  fluidsEnrichNote = null,
  enrichingFluids = false,
  applyingEngine = false,
  onPickEngine,
}: {
  data: EstimateLabVehicleSpecsBundle | null;
  canEdit?: boolean;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  loading?: boolean;
  loadError?: string | null;
  engineOptions?: VehicleSpecsEngineOption[];
  refreshNote?: string | null;
  fluidsEnrichNote?: string | null;
  enrichingFluids?: boolean;
  applyingEngine?: boolean;
  onPickEngine?: (epaVehicleId: string) => void | Promise<void>;
}) {
  const ymm = data ? vehicleYmmLabel(data.specs) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "size-7 shrink-0 text-muted-foreground/75 hover:bg-white hover:text-brand-navy",
              className,
            )}
            aria-label="Vehicle specifications"
            title="Vehicle specifications"
          >
            <Info className="size-3.5" />
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="flex max-h-[min(90vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-r from-brand-navy/[0.04] to-transparent px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-brand-navy">
            Vehicle specifications
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {ymm
              ? `${ymm} — refreshed each time you open Specs.`
              : "Fluids and identity — refreshed each time you open Specs. VIN optional."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading && !data ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-brand-navy" aria-hidden />
              Loading vehicle specs…
            </div>
          ) : loadError && !data ? (
            <div className="px-6 py-10 text-center text-sm text-brand-red">{loadError}</div>
          ) : data ? (
            <VehicleSpecsReferenceBody
              data={data}
              layout="dialog"
              engineOptions={engineOptions}
              refreshNote={refreshNote}
              fluidsEnrichNote={fluidsEnrichNote}
              enrichingFluids={enrichingFluids}
              applyingEngine={applyingEngine}
              onPickEngine={onPickEngine}
            />
          ) : (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Open Specs to load vehicle reference data.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
