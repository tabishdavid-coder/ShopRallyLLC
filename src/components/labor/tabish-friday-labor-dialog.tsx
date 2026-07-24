"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { TabishFridayLaborWorkspace } from "@/components/labor/tabish-friday-labor-workspace";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SmartLaborGuide } from "@/components/repair-order/smart-labor-guide";
import type { QuickLaborVehicle } from "@/lib/quick-labor";
import {
  TABISH_FRIDAY_LABOR_HTML_PATH,
  TABISH_FRIDAY_LABOR_TITLE,
} from "@/lib/tabish-friday-labor";
import type { LaborCartLine } from "@/lib/labor-guide-types";
import { useMotorLaborUiEnabled } from "@/lib/shop-capabilities";

type GuideLine = Omit<LaborCartLine, "key">;

/**
 * Estimate Labor Lookup dialog — Pro/Elite opens Tabish Friday Labor;
 * Starter or missing assets fall back to SmartLaborGuide (shop library).
 */
export function TabishFridayLaborDialog({
  open,
  onOpenChange,
  roId,
  vehicleId,
  initialVehicle,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
  addMode = "createJob",
  onAddLines,
  submitLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  vehicleId: string;
  initialVehicle?: QuickLaborVehicle | null;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
  addMode?: "createJob" | "addLines";
  onAddLines?: (lines: GuideLine[]) => void;
  submitLabel?: string;
}) {
  const motorLaborOk = useMotorLaborUiEnabled();
  const [assetOk, setAssetOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open || !motorLaborOk) return;
    let cancelled = false;
    fetch(TABISH_FRIDAY_LABOR_HTML_PATH, { method: "HEAD" })
      .then((res) => {
        if (!cancelled) setAssetOk(res.ok);
      })
      .catch(() => {
        if (!cancelled) setAssetOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, motorLaborOk]);

  const handleAddLines = useCallback(
    (lines: GuideLine[]) => {
      onAddLines?.(lines);
      onOpenChange(false);
    },
    [onAddLines, onOpenChange],
  );

  const handleJobCreated = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const useTabishFriday = motorLaborOk && assetOk !== false;

  if (!motorLaborOk || (open && assetOk === false)) {
    return (
      <SmartLaborGuide
        vehicleId={vehicleId}
        roId={roId}
        customerName={customerName}
        vehicleLabel={vehicleLabel}
        specLine={specLine}
        mileageIn={mileageIn}
        odometerNotWorking={odometerNotWorking}
        presentation="floating"
        open={open}
        onOpenChange={onOpenChange}
        hideTrigger
        addMode={addMode}
        onAddLines={addMode === "addLines" ? onAddLines : undefined}
        submitLabel={submitLabel}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(92vh,920px)] max-h-[92vh] w-[min(96vw,1280px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0"
      >
        <div className="shrink-0 border-b border-border/80 px-4 py-3">
          <DialogTitle className="text-base font-bold text-brand-navy">
            {TABISH_FRIDAY_LABOR_TITLE}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Labor · Fluid Specs · Combined Jobs · Diagrams · Procedures — Pro/Elite labor guide
          </DialogDescription>
        </div>

        {assetOk === null ? (
          <div className="flex min-h-[320px] flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-brand-navy/50" />
          </div>
        ) : useTabishFriday ? (
          <TabishFridayLaborWorkspace
            initialVehicle={initialVehicle}
            roId={roId}
            onAddLines={addMode === "addLines" ? handleAddLines : undefined}
            onJobCreated={addMode === "createJob" ? handleJobCreated : undefined}
            className="min-h-0 flex-1"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
