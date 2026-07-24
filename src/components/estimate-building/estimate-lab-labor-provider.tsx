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

import { TabishFridayLaborGuideDialog } from "@/components/labor-guide/tabish-friday-labor-guide";
import { SmartLaborGuide } from "@/components/repair-order/smart-labor-guide";
import type { LaborCartLine } from "@/lib/labor-guide-types";
import { useTabishFridayLaborUiEnabled } from "@/lib/shop-capabilities";

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
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
}: {
  children: ReactNode;
  roId: string;
  vehicleId: string;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
}) {
  const tfl = useTabishFridayLaborUiEnabled();
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
      {tfl ? (
        <TabishFridayLaborGuideDialog open={open} onOpenChange={handleOpenChange} />
      ) : (
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
          onOpenChange={handleOpenChange}
          hideTrigger
          addMode={addMode}
          onAddLines={addMode === "addLines" ? handleAddLines : undefined}
          submitLabel={addMode === "addLines" ? "Add to job" : undefined}
        />
      )}
    </EstimateLabLaborContext.Provider>
  );
}
