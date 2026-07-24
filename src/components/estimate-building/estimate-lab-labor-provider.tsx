"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { TabishFridayLaborDialog } from "@/components/labor/tabish-friday-labor-dialog";
import type { QuickLaborVehicle } from "@/lib/quick-labor";
import type { LaborCartLine } from "@/lib/labor-guide-types";

type GuideLine = Omit<LaborCartLine, "key">;

type OpenOptions = {
  onAddLines?: (lines: GuideLine[]) => void;
};

type Ctx = {
  openLaborGuide: (options?: OpenOptions) => void;
};

const EstimateLabLaborContext = createContext<Ctx | null>(null);

export function useEstimateLabLabor() {
  const ctx = useContext(EstimateLabLaborContext);
  if (!ctx) {
    throw new Error("useEstimateLabLabor must be used within EstimateLabLaborProvider");
  }
  return ctx;
}

/** Optional hook — returns null outside lab labor provider (non-lab job cards). */
export function useEstimateLabLaborOptional() {
  return useContext(EstimateLabLaborContext);
}

export function EstimateLabLaborProvider({
  children,
  roId,
  vehicleId,
  initialVehicle,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
}: {
  children: ReactNode;
  roId: string;
  vehicleId: string;
  /** RO vehicle — prefill Tabish Friday when VIN/YMM present; else decode gate inside dialog. */
  initialVehicle?: QuickLaborVehicle | null;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [addMode, setAddMode] = useState<"createJob" | "addLines">("createJob");
  const onAddLinesRef = useRef<((lines: GuideLine[]) => void) | null>(null);

  const openLaborGuide = useCallback((options?: OpenOptions) => {
    if (options?.onAddLines) {
      setAddMode("addLines");
      onAddLinesRef.current = options.onAddLines;
    } else {
      setAddMode("createJob");
      onAddLinesRef.current = null;
    }
    setOpen(true);
  }, []);

  const handleAddLines = useCallback((lines: GuideLine[]) => {
    onAddLinesRef.current?.(lines);
    onAddLinesRef.current = null;
    setAddMode("createJob");
    setOpen(false);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      onAddLinesRef.current = null;
      setAddMode("createJob");
    }
  }, []);

  const value = useMemo(() => ({ openLaborGuide }), [openLaborGuide]);

  return (
    <EstimateLabLaborContext.Provider value={value}>
      {children}
      <TabishFridayLaborDialog
        open={open}
        onOpenChange={handleOpenChange}
        roId={roId}
        vehicleId={vehicleId}
        initialVehicle={initialVehicle}
        customerName={customerName}
        vehicleLabel={vehicleLabel}
        specLine={specLine}
        mileageIn={mileageIn}
        odometerNotWorking={odometerNotWorking}
        addMode={addMode}
        onAddLines={addMode === "addLines" ? handleAddLines : undefined}
        submitLabel={addMode === "addLines" ? "Add to job" : undefined}
      />
    </EstimateLabLaborContext.Provider>
  );
}
