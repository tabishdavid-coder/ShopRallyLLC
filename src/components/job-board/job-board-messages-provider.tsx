"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { RoMessages } from "@/components/repair-order/ro-messages";
import { SMS_ENABLED } from "@/lib/features";
import { smsPhoneHref } from "@/lib/ro-context-display";

export type JobBoardMessagesTarget = {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  marketingOptIn: boolean;
  roId: string;
};

type JobBoardMessagesContextValue = {
  openRoMessages: (target: JobBoardMessagesTarget) => void;
};

const JobBoardMessagesContext = createContext<JobBoardMessagesContextValue | null>(null);

export function useJobBoardMessagesOptional() {
  return useContext(JobBoardMessagesContext);
}

export function JobBoardMessagesProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<JobBoardMessagesTarget | null>(null);
  const [dockKey, setDockKey] = useState(0);

  const openRoMessages = useCallback((next: JobBoardMessagesTarget) => {
    if (!SMS_ENABLED) {
      if (next.customerPhone) {
        window.location.href = smsPhoneHref(next.customerPhone);
      }
      return;
    }
    setTarget(next);
    setOpen(true);
    // Remount dock so a minimized chip expands on every Chat click.
    setDockKey((k) => k + 1);
  }, []);

  const value = useMemo(() => ({ openRoMessages }), [openRoMessages]);

  return (
    <JobBoardMessagesContext.Provider value={value}>
      {children}
      {target && SMS_ENABLED ? (
        <RoMessages
          key={dockKey}
          customerId={target.customerId}
          customerName={target.customerName}
          customerPhone={target.customerPhone}
          marketingOptIn={target.marketingOptIn}
          roId={target.roId}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setTarget(null);
          }}
          hideTrigger
        />
      ) : null}
    </JobBoardMessagesContext.Provider>
  );
}
