"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  markEstimateViewNotified,
  pollEstimateViewed,
} from "@/server/actions/estimate-events";

const POLL_MS =
  process.env.NODE_ENV === "development" ? 120_000 : 30_000;

export function EstimateViewToast({
  roId,
  initialViewed,
  initialNotified,
  roNumber,
}: {
  roId: string;
  initialViewed: boolean;
  initialNotified: boolean;
  roNumber: number;
}) {
  const [visible, setVisible] = useState(initialViewed && !initialNotified);
  const [number, setNumber] = useState(roNumber);

  useEffect(() => {
    // SSR already knows viewed/notified — polling only needed while waiting for customer open.
    if (initialNotified || initialViewed) return;

    let dismissed = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function check() {
      if (dismissed || document.hidden) return;
      try {
        const status = await pollEstimateViewed(roId);
        if (!status || dismissed) return;
        setNumber(status.roNumber);
        if (status.viewed && !status.notified) {
          setVisible(true);
          if (intervalId) clearInterval(intervalId);
        }
      } catch {
        /* Neon blip — ignore until next poll */
      }
    }

    function startPolling() {
      if (intervalId) return;
      intervalId = setInterval(check, POLL_MS);
      void check();
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function onVisibilityChange() {
      if (document.hidden) stopPolling();
      else startPolling();
    }

    startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      dismissed = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [roId, initialNotified, initialViewed]);

  if (!visible) return null;

  async function dismiss() {
    setVisible(false);
    await markEstimateViewNotified(roId);
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg"
    >
      <Eye className="size-5 shrink-0 text-emerald-700" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-emerald-900">
          Customer viewed estimate for RO #{number}
        </p>
        <p className="text-xs text-emerald-800/80">
          They opened the approval link — follow up if needed.
        </p>
      </div>
      <Button variant="ghost" size="sm" asChild className="shrink-0 text-emerald-900">
        <Link href={`/repair-orders/${roId}/estimate`}>View</Link>
      </Button>
      <button
        type="button"
        onClick={() => void dismiss()}
        className="shrink-0 rounded-md p-1 text-emerald-800 hover:bg-emerald-100"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
