"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Cable, Download, ExternalLink, Loader2, Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WiringSystem } from "@/generated/prisma";
import { WIRING_SYSTEMS, WIRING_SYSTEM_LABELS } from "@/lib/wiring-systems";
import {
  downloadWiringDiagramAction,
  getWiringDiagramPanelState,
  type WiringPanelState,
} from "@/server/actions/wiring-diagrams";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function LaborWiringTab({ vehicleId }: { vehicleId: string }) {
  const [state, setState] = useState<WiringPanelState | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<WiringSystem>("ENGINE_MANAGEMENT");
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [downloading, startDownload] = useTransition();

  const refresh = useCallback(() => {
    startLoad(async () => {
      setLocalError(null);
      const res = await getWiringDiagramPanelState(vehicleId);
      setState(res);
      if (!res.ok) setLocalError(res.error);
    });
  }, [vehicleId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const diagramForSystem =
    state?.ok === true
      ? state.diagrams.find((d) => d.wiringSystem === selectedSystem) ?? null
      : null;

  const availability = state?.ok === true ? state.availability : null;
  const canDownload =
    availability?.featureEnabled &&
    availability.releaseEnabled &&
    availability.hasActiveSubscription &&
    !availability.activeDownloadJobId;

  function onDownload() {
    startDownload(async () => {
      setLocalError(null);
      const res = await downloadWiringDiagramAction(vehicleId, selectedSystem);
      if (!res.ok) {
        setLocalError(res.error);
        refresh();
        return;
      }
      refresh();
    });
  }

  if (loading && !state) {
    return (
      <div className="flex items-center gap-2 px-4 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-brand-light" />
        Loading wiring diagrams…
      </div>
    );
  }

  if (state && !state.ok) {
    return (
      <div className="space-y-3 px-4 py-6">
        <div className="flex items-start gap-2 rounded-lg border border-brand-red/20 bg-brand-red/5 px-3 py-3 text-sm text-brand-navy">
          <Lock className="mt-0.5 size-4 shrink-0 text-brand-red" />
          <p>{state.error}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
          <RefreshCw className="size-3.5" /> Retry
        </Button>
      </div>
    );
  }

  if (!availability) return null;

  const blockedReason = !availability.releaseEnabled
    ? "Wiring diagrams are not released for this shop yet. Ask a platform admin to enable the release flag."
    : !availability.featureEnabled
      ? "Upgrade to Pro or Elite for OEM wiring diagrams."
      : !availability.brand
        ? "Add vehicle make (and VIN for Honda) to resolve the OEM portal."
        : !availability.hasActiveSubscription
          ? `No active ${availability.brand} TechInfo subscription on file for this shop.`
          : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-brand-navy/10 bg-brand-navy/[0.04] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Cable className="size-4 text-brand-light" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy/80">
            Wiring Diagrams
          </span>
          {availability.providerMode === "stub" ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Stub provider
            </span>
          ) : (
            <span className="rounded-full bg-brand-light/15 px-2 py-0.5 text-[10px] font-semibold text-brand-navy">
              Live portal
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={refresh}
          disabled={loading}
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(12rem,16rem)_1fr]">
        <div className="space-y-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            System
          </p>
          {WIRING_SYSTEMS.map((sys) => {
            const cached = availability.cachedSystems.includes(sys);
            return (
              <button
                key={sys}
                type="button"
                onClick={() => setSelectedSystem(sys)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                  selectedSystem === sys
                    ? "border-brand-light bg-brand-light/12 font-semibold text-brand-navy"
                    : "border-transparent hover:bg-brand-light/8",
                )}
              >
                <span>{WIRING_SYSTEM_LABELS[sys]}</span>
                {cached ? (
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-800">
                    Cached
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-[14rem] flex-col rounded-lg border border-brand-navy/10 bg-card">
          {diagramForSystem ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">
                    {WIRING_SYSTEM_LABELS[diagramForSystem.wiringSystem]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {diagramForSystem.sourceBrand.toUpperCase()} · cached{" "}
                    {formatDate(diagramForSystem.downloadedAt)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={diagramForSystem.viewUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" /> Open
                  </a>
                </Button>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Diagram cached for this vehicle. Shop-licensed — do not redistribute.
                </p>
                <iframe
                  title={`${WIRING_SYSTEM_LABELS[diagramForSystem.wiringSystem]} wiring diagram`}
                  src={diagramForSystem.viewUrl}
                  className="h-[min(420px,50vh)] w-full rounded-md border border-brand-navy/10 bg-muted/20"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <p className="max-w-sm text-sm text-muted-foreground">
                No cached diagram for{" "}
                <strong className="text-foreground">{WIRING_SYSTEM_LABELS[selectedSystem]}</strong>
                {availability.brand ? ` (${availability.brand})` : ""}.
              </p>
              {blockedReason ? (
                <p className="max-w-md text-xs text-muted-foreground">{blockedReason}</p>
              ) : null}
              {localError ? (
                <p className="max-w-md rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {localError}
                </p>
              ) : null}
              <Button
                onClick={onDownload}
                disabled={!canDownload || downloading || Boolean(blockedReason)}
                className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
              >
                {downloading || availability.activeDownloadJobId ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {availability.activeDownloadJobId ? "Download in progress…" : "Download now"}
              </Button>
              {availability.subscriptionEndsAt ? (
                <p className="text-[11px] text-muted-foreground">
                  Subscription through {formatDate(availability.subscriptionEndsAt)}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
