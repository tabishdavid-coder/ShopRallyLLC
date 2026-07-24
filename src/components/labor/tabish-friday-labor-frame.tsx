"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

import type { QuickLaborVehicle } from "@/lib/quick-labor";
import {
  TABISH_FRIDAY_LABOR_HTML_PATH,
  TABISH_FRIDAY_LABOR_TITLE,
  buildTabishFridayLaborIframeSrc,
  isTabishFridayLaborMessage,
  tabishFridayLaborCartToGuideLines,
  type TabishFridayLaborCartItem,
} from "@/lib/tabish-friday-labor";
import type { LaborCartLine } from "@/lib/labor-guide-types";
import { cn } from "@/lib/utils";

type GuideLine = Omit<LaborCartLine, "key">;

export function TabishFridayLaborFrame({
  vehicle,
  roId,
  shopId,
  className,
  onAddLines,
  onCreateJob,
  onQuickLaborTicket,
}: {
  vehicle: QuickLaborVehicle;
  roId?: string;
  shopId?: string;
  className?: string;
  /** Add lines to an existing job (estimate inline add). */
  onAddLines?: (lines: GuideLine[]) => void;
  /** Create a new job from staged cart (estimate toolbar / quick labor). */
  onCreateJob?: (lines: GuideLine[], jobName: string) => void;
  /** Quick Labor — no RO; start new RO with vehicle + concern prefill. */
  onQuickLaborTicket?: (lines: GuideLine[], jobName: string) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [assetOk, setAssetOk] = useState<boolean | null>(null);
  const src = buildTabishFridayLaborIframeSrc(vehicle, { embedded: true, roId, shopId });

  useEffect(() => {
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
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!isTabishFridayLaborMessage(event.data)) return;

      const items = event.data.lines as TabishFridayLaborCartItem[];
      if (!items.length) return;

      const lines = tabishFridayLaborCartToGuideLines(items);
      if (onAddLines) {
        onAddLines(lines);
        return;
      }
      if (onCreateJob) {
        const primary = items[0]?.name.split("—")[0]?.trim() || "Labor guide job";
        onCreateJob(lines, primary);
        return;
      }
      if (onQuickLaborTicket) {
        const primary = items[0]?.name.split("—")[0]?.trim() || "Labor lookup";
        onQuickLaborTicket(lines, primary);
      }
    },
    [onAddLines, onCreateJob, onQuickLaborTicket],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (assetOk === null) {
    return (
      <div className={cn("flex min-h-[320px] items-center justify-center bg-muted/10", className)}>
        <Loader2 className="size-6 animate-spin text-brand-navy/50" aria-label="Loading labor guide" />
      </div>
    );
  }

  if (assetOk === false) {
    return (
      <div
        className={cn(
          "flex min-h-[320px] flex-col items-center justify-center gap-2 px-6 text-center",
          className,
        )}
      >
        <AlertTriangle className="size-8 text-amber-600" />
        <p className="text-sm font-semibold text-brand-navy">{TABISH_FRIDAY_LABOR_TITLE} unavailable</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Static lab assets missing at {TABISH_FRIDAY_LABOR_HTML_PATH}. Falling back to shop labor
          library is required.
        </p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title={TABISH_FRIDAY_LABOR_TITLE}
      src={src}
      className={cn("size-full min-h-0 border-0 bg-white", className)}
      allow="clipboard-read; clipboard-write"
    />
  );
}
