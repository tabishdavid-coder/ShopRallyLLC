"use client";

import { Info } from "lucide-react";

import { EstimateLabVehicleSpecsSection } from "@/components/estimate-building/estimate-lab-vehicle-specs-section";
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
import { cn } from "@/lib/utils";

/** AutoLeap-style vehicle specifications reference from the context strip. */
export function EstimateLabVehicleSpecsDialog({
  data,
  canEdit,
  className,
}: {
  data: EstimateLabVehicleSpecsBundle;
  canEdit: boolean;
  className?: string;
}) {
  return (
    <Dialog>
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
      <DialogContent className="flex max-h-[min(85vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-brand-navy">Vehicle specifications</DialogTitle>
          <DialogDescription className="sr-only">
            Engine, drivetrain, tire sizes, and other vehicle reference data for this repair order.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EstimateLabVehicleSpecsSection data={data} canEdit={canEdit} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
