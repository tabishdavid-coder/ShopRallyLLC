"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useEstimateLabContextDrawer } from "@/components/estimate-building/estimate-lab-context-drawer-provider";
import { parseRoContextAction } from "@/lib/ro-context-actions";

function DeeplinkInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ctx = useEstimateLabContextDrawer();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    const action = parseRoContextAction(searchParams.get("ctx"));
    if (!action) {
      handled.current = null;
      return;
    }

    const key = `${action}:${searchParams.toString()}`;
    if (handled.current === key) return;
    handled.current = key;

    const open = () => {
      if (action === "history") ctx.openCustomerHistory();
      else if (action === "messages") ctx.openMessages();
      else if (action === "payment") ctx.openDrawer("payment");
      else ctx.openVehicleSpecs();
    };

    // Messages host registers on mount — defer one frame.
    const t = window.setTimeout(open, 50);

    const path = window.location.pathname;
    router.replace(path, { scroll: false });

    return () => window.clearTimeout(t);
  }, [ctx, router, searchParams]);

  return null;
}

/** Opens customer drawer / messages / specs when landing from job board quick actions (?ctx=). */
export function EstimateLabContextDeeplink() {
  return (
    <Suspense fallback={null}>
      <DeeplinkInner />
    </Suspense>
  );
}
