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
import { RoIntakeChooserDialog } from "@/components/repair-order/ro-intake-chooser-dialog";
import { RoIntakeDialog } from "@/components/repair-order/ro-intake-dialog";
import { SmartRoIntakeDialog } from "@/components/repair-order/smart-ro-intake-dialog";

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
  const [chooserOpen, setChooserOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [initial, setInitial] = useState<RoIntakeOpenOptions>({});

  const openIntake = useCallback(
    (opts?: RoIntakeOpenOptions) => {
      if (!config) return;
      setInitial(opts ?? {});
      if (opts?.customerId) {
        setManualOpen(true);
        return;
      }
      setChooserOpen(true);
    },
    [config],
  );

  const value = useMemo(
    () => ({ openIntake, config }),
    [openIntake, config],
  );

  return (
    <RoIntakeContext.Provider value={value}>
      {children}
      {config ? (
        <>
          <RoIntakeChooserDialog
            open={chooserOpen}
            onOpenChange={setChooserOpen}
            onSmart={() => setSmartOpen(true)}
            onManual={() => setManualOpen(true)}
          />
          <SmartRoIntakeDialog
            open={smartOpen}
            onOpenChange={setSmartOpen}
            config={config}
          />
          <RoIntakeDialog
            open={manualOpen}
            onOpenChange={setManualOpen}
            config={config}
            initialCustomerId={initial.customerId}
            initialVehicleId={initial.vehicleId}
          />
        </>
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
