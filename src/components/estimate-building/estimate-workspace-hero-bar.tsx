"use client";

import { Badge } from "@/components/ui/badge";
import { EstimateLabServiceAdvisorSelect } from "@/components/estimate-building/estimate-lab-service-advisor-select";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import { cn } from "@/lib/utils";
import type { ROStatus } from "@/generated/prisma";

function formatRoCreated(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Estimate workspace top bar — RO #, customer, status, advisor, actions.
 *  Canonical compact header for every `/repair-orders/[id]/*` tab (Estimate,
 *  Inspections, Overview, Work-in-Progress, Payment, Membership) — see
 *  `RepairOrderLayout`. Keep this the single source of hero chrome so tabs
 *  don't drift back to the old dense hero + context-deck stack. */
export function EstimateWorkspaceHeroBar({
  roId,
  roNumber,
  roStatus,
  customerName,
  vehicleLabel,
  createdAt,
  createdByName,
  serviceWriterId,
  serviceWriters,
  canEdit,
  odometer,
  actions,
}: {
  roId: string;
  roNumber: number;
  roStatus: ROStatus;
  customerName: string;
  /** Short "Year Make Model" line — omitted when the RO has no vehicle. */
  vehicleLabel?: string | null;
  createdAt: string;
  createdByName?: string | null;
  serviceWriterId: string | null;
  serviceWriters: { id: string; name: string }[];
  canEdit: boolean;
  /** Compact odometer in/out control (e.g. `RoOdometerHeader`); omitted on tabs that don't need it. */
  odometer?: React.ReactNode;
  actions: React.ReactNode;
}) {
  const pill = RO_STATUS_PILL[roStatus];
  const createdMeta = `Created ${formatRoCreated(createdAt)}${createdByName ? ` by ${createdByName}` : ""}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h1
        className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-foreground md:text-base"
        title={`${createdMeta} · ${customerName}`}
      >
        RO #{roNumber}
        <span className="mx-1.5 font-normal text-muted-foreground/45" aria-hidden>
          ·
        </span>
        <span className="font-semibold text-foreground">{customerName}</span>
        {vehicleLabel ? (
          <>
            <span className="mx-1.5 font-normal text-muted-foreground/45" aria-hidden>
              ·
            </span>
            <span className="font-normal text-muted-foreground">{vehicleLabel}</span>
          </>
        ) : null}
        <Badge className={cn("ml-2 align-middle text-[10px]", pill.className)}>{pill.label}</Badge>
      </h1>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {odometer ? (
          <div className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            {odometer}
          </div>
        ) : null}
        <EstimateLabServiceAdvisorSelect
          roId={roId}
          serviceWriterId={serviceWriterId}
          serviceWriters={serviceWriters}
          canEdit={canEdit}
          compact
          className="shrink-0"
        />
        <div className="flex shrink-0 flex-wrap items-center gap-1">{actions}</div>
      </div>
    </div>
  );
}
