"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { RoIntakeConfig, RoIntakeOpenOptions } from "@/lib/ro-intake-types";
import { RoIntakeDialog } from "@/components/repair-order/ro-intake-dialog";

type RoIntakeContextValue = {
  openIntake: (opts?: RoIntakeOpenOptions) => void;
  config: RoIntakeConfig | null;
};

const RoIntakeContext = createContext<RoIntakeContextValue | null>(null);

export function RoIntakeProvider({
  config,
  children,
}: {
  config: RoIntakeConfig | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState<RoIntakeOpenOptions>({});

  const openIntake = useCallback((opts?: RoIntakeOpenOptions) => {
    if (!config) return;
    setInitial(opts ?? {});
    setOpen(true);
  }, [config]);

  const value = useMemo(
    () => ({ openIntake, config }),
    [openIntake, config],
  );

  return (
    <RoIntakeContext.Provider value={value}>
      {children}
      {config ? (
        <RoIntakeDialog
          open={open}
          onOpenChange={setOpen}
          config={config}
          initialCustomerId={initial.customerId}
          initialVehicleId={initial.vehicleId}
        />
      ) : null}
    </RoIntakeContext.Provider>
  );
}

export function useRoIntake(): RoIntakeContextValue {
  const ctx = useContext(RoIntakeContext);
  if (!ctx) {
    throw new Error("useRoIntake must be used within RoIntakeProvider");
  }
  return ctx;
}

/** Safe variant for optional wiring (returns no-op when provider missing). */
export function useRoIntakeOptional(): RoIntakeContextValue {
  const ctx = useContext(RoIntakeContext);
  return ctx ?? { openIntake: () => {}, config: null };
}
