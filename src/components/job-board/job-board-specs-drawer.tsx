"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { Car, Loader2, X } from "lucide-react";

import { EstimateLabVehicleSpecsSection } from "@/components/estimate-building/estimate-lab-vehicle-specs-section";
import { Sheet, SheetOverlay, SheetPortal } from "@/components/ui/sheet";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { fetchVehicleSpecsBundle } from "@/server/actions/vehicle-specs";
import { cn } from "@/lib/utils";

/** Right drawer — full vehicle specs for an RO (job board Car specs action). */
export function JobBoardSpecsDrawer({
  open,
  onOpenChange,
  vehicleId,
  vehicleLabel,
  roId,
  roNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleLabel: string;
  roId: string;
  roNumber: number;
}) {
  const [data, setData] = useState<EstimateLabVehicleSpecsBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();

  const reload = useCallback(() => {
    startLoad(async () => {
      try {
        const res = await fetchVehicleSpecsBundle(vehicleId, { excludeRoId: roId });
        if (res.ok) {
          setData(res.data);
          setLoadError(null);
        } else {
          setLoadError(res.error);
        }
      } catch {
        setLoadError("Could not load vehicle specs. Try again.");
      }
    });
  }, [roId, vehicleId]);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setLoadError(null);
    reload();
  }, [open, vehicleId, roId, reload]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPortal>
        <SheetOverlay className="bg-black/45 backdrop-blur-[1px] duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <SheetPrimitive.Content
          aria-describedby={undefined}
          data-side="right"
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 overflow-hidden bg-[#f8fafc] p-0 shadow-2xl outline-none",
            "border-l border-brand-navy/10 sm:max-w-[min(42rem,calc(100vw-0.5rem))]",
            "duration-300 ease-out data-open:animate-in data-closed:animate-out",
            "data-open:slide-in-from-right data-closed:slide-out-to-right data-open:fade-in-0 data-closed:fade-out-0",
          )}
        >
          <header className="shrink-0 border-b border-border/80 bg-white px-4 py-3">
            <div className="flex min-w-0 items-start gap-2 pr-10">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy/8 text-brand-navy">
                <Car className="size-4" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-brand-navy">{vehicleLabel}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  RO #{roNumber} · Vehicle specs
                </p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-white">
            {loading && !data ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-brand-navy" />
                Loading vehicle specs…
              </div>
            ) : null}

            {loadError ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-brand-red">{loadError}</p>
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-brand-navy underline"
                  onClick={reload}
                >
                  Retry
                </button>
              </div>
            ) : null}

            {data ? (
              <EstimateLabVehicleSpecsSection data={data} canEdit />
            ) : null}
          </div>

          <SheetPrimitive.Close className="absolute top-3.5 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}
