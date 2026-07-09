"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { JobBoardHistoryDrawer } from "@/components/job-board/job-board-history-drawer";
import { JobBoardSpecsDrawer } from "@/components/job-board/job-board-specs-drawer";

export type JobBoardHistoryTarget = {
  customerId: string;
  customerName: string;
  roId: string;
  roNumber: number;
};

export type JobBoardSpecsTarget = {
  vehicleId: string;
  vehicleLabel: string;
  roId: string;
  roNumber: number;
};

type JobBoardContextValue = {
  openCustomerHistory: (target: JobBoardHistoryTarget) => void;
  openVehicleSpecs: (target: JobBoardSpecsTarget) => void;
};

const JobBoardContext = createContext<JobBoardContextValue | null>(null);

export function useJobBoardContextOptional() {
  return useContext(JobBoardContext);
}

/** @deprecated Use useJobBoardContextOptional */
export function useJobBoardHistoryOptional() {
  return useContext(JobBoardContext);
}

export function JobBoardHistoryProvider({ children }: { children: ReactNode }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<JobBoardHistoryTarget | null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [specsTarget, setSpecsTarget] = useState<JobBoardSpecsTarget | null>(null);

  const openCustomerHistory = useCallback((next: JobBoardHistoryTarget) => {
    setHistoryTarget(next);
    setHistoryOpen(true);
  }, []);

  const openVehicleSpecs = useCallback((next: JobBoardSpecsTarget) => {
    setSpecsTarget(next);
    setSpecsOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openCustomerHistory, openVehicleSpecs }),
    [openCustomerHistory, openVehicleSpecs],
  );

  return (
    <JobBoardContext.Provider value={value}>
      {children}
      {historyTarget ? (
        <JobBoardHistoryDrawer
          open={historyOpen}
          onOpenChange={(next) => {
            setHistoryOpen(next);
            if (!next) setHistoryTarget(null);
          }}
          customerId={historyTarget.customerId}
          customerName={historyTarget.customerName}
          roId={historyTarget.roId}
          roNumber={historyTarget.roNumber}
        />
      ) : null}
      {specsTarget ? (
        <JobBoardSpecsDrawer
          open={specsOpen}
          onOpenChange={(next) => {
            setSpecsOpen(next);
            if (!next) setSpecsTarget(null);
          }}
          vehicleId={specsTarget.vehicleId}
          vehicleLabel={specsTarget.vehicleLabel}
          roId={specsTarget.roId}
          roNumber={specsTarget.roNumber}
        />
      ) : null}
    </JobBoardContext.Provider>
  );
}
