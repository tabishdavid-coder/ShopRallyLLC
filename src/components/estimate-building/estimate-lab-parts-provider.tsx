"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { EstimateLabPartsMenu } from "@/components/estimate-building/estimate-lab-parts-menu";
import type { HubPart } from "@/lib/hub-parts";
import type { ServiceJobSummary } from "@/lib/service-job-parts";
import type { IntegrationConnectionState } from "@/lib/integrations";

export type EstimateLabPartsJob = ServiceJobSummary;

export type PartsMenuMode = "home" | "manual" | "lookup";

type OpenOptions = { jobId?: string | null; mode?: PartsMenuMode };

type Ctx = {
  openPartsMenu: (options?: OpenOptions) => void;
  jobs: EstimateLabPartsJob[];
  hubParts: HubPart[];
};

const EstimateLabPartsContext = createContext<Ctx | null>(null);

export function useEstimateLabParts() {
  const ctx = useContext(EstimateLabPartsContext);
  if (!ctx) {
    throw new Error("useEstimateLabParts must be used within EstimateLabPartsProvider");
  }
  return ctx;
}

/** Safe for surfaces that may render outside the parts provider (e.g. empty estimate). */
export function useEstimateLabPartsOptional() {
  return useContext(EstimateLabPartsContext);
}

export function EstimateLabPartsProvider({
  children,
  roId,
  jobs,
  hubParts,
  vehicleLabel,
  specLine,
  canEdit,
  partstechState,
  weldonState,
}: {
  children: ReactNode;
  roId: string;
  jobs: EstimateLabPartsJob[];
  hubParts: HubPart[];
  vehicleLabel: string;
  specLine: string;
  canEdit: boolean;
  partstechState: IntegrationConnectionState;
  weldonState: IntegrationConnectionState;
}) {
  const [open, setOpen] = useState(false);
  const [initialJobId, setInitialJobId] = useState<string | null>(null);
  const [initialMode, setInitialMode] = useState<PartsMenuMode>("home");

  const openPartsMenu = useCallback((options?: OpenOptions) => {
    setInitialJobId(options?.jobId ?? null);
    setInitialMode(options?.mode ?? "home");
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openPartsMenu, jobs, hubParts }),
    [openPartsMenu, jobs, hubParts],
  );

  return (
    <EstimateLabPartsContext.Provider value={value}>
      {children}
      <EstimateLabPartsMenu
        open={open}
        onOpenChange={setOpen}
        roId={roId}
        jobs={jobs}
        hubParts={hubParts}
        vehicleLabel={vehicleLabel}
        specLine={specLine}
        canEdit={canEdit}
        initialJobId={initialJobId}
        initialMode={initialMode}
        partstechState={partstechState}
        weldonState={weldonState}
      />
    </EstimateLabPartsContext.Provider>
  );
}
