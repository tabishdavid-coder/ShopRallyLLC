"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Car, ClipboardList, Wrench } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fmtDateTime, toDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";

/** Dates may be `Date` on the server or ISO strings after RSC → client serialization. */
export type EstimateLabQuickReferenceData = {
  createdAt: Date | string;
  promiseTime: Date | string | null;
  approvalSentAt: Date | string | null;
  estimateViewedAt: Date | string | null;
  authorizedAt: Date | string | null;
  partsNeeded: number;
  partsQuoted: number;
  partsOrdered: number;
  technicianId: string | null;
  technicianName: string | null;
  unassignedJobs: number;
  vin: string | null;
  plate: string | null;
  plateState: string | null;
};

const QR_DT_OPTS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

function fmtDate(d: Date | string) {
  return fmtDateTime(d, QR_DT_OPTS);
}

function fmtRelativeDays(from: Date | string) {
  const days = Math.floor((Date.now() - toDate(from).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function RefRow({
  label,
  value,
  muted,
  mono,
  title,
}: {
  label: string;
  value: string;
  muted?: boolean;
  mono?: boolean;
  title?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[12px]">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right font-medium",
          mono ? "font-mono text-[11px] tracking-tight" : "tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
        title={title}
      >
        {value}
      </span>
    </div>
  );
}

const EMPTY = "Not set";

function PartsPill({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums", tone)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-brand-navy">{count}</span>
    </span>
  );
}

/** Read-only quick-reference block — fills flex gap below Profitability (research stub). */
export function EstimateLabQuickReference({
  data,
  hideVehicleSection = false,
}: {
  data: EstimateLabQuickReferenceData;
  /** When vehicle specs accordion is shown in the rail, skip duplicate VIN/plate rows. */
  hideVehicleSection?: boolean;
}) {
  // Relative age uses Date.now() — compute after mount to avoid SSR/client hydration drift.
  const [roAge, setRoAge] = useState("—");
  useEffect(() => {
    setRoAge(fmtRelativeDays(data.createdAt));
  }, [data.createdAt]);

  const outreach =
    data.authorizedAt != null
      ? `Authorized ${fmtDate(data.authorizedAt)}`
      : data.estimateViewedAt != null
        ? `Viewed ${fmtDate(data.estimateViewedAt)}`
        : data.approvalSentAt != null
          ? `Sent ${fmtDate(data.approvalSentAt)}`
          : "Not sent";

  const partsTotal = data.partsNeeded + data.partsQuoted + data.partsOrdered;

  return (
    <Collapsible defaultOpen className="flex min-h-0 flex-1 flex-col border-t border-border">
      <CollapsibleTrigger className="ro-sidebar-accordion-trigger group flex w-full shrink-0 items-center gap-2 bg-slate-50/80 px-3 py-2.5 text-left text-[13px] font-semibold tracking-tight text-brand-navy">
        <ClipboardList className="size-4 shrink-0 text-brand-navy/70" />
        <span className="min-w-0 flex-1 truncate">Quick reference</span>
        <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">Preview</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ro-sidebar-accordion-content min-h-0 flex-1 overflow-y-auto bg-white px-3 py-3">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="size-3" aria-hidden />
              Workflow
            </p>
            <RefRow label="RO age" value={roAge} />
            <RefRow
              label="Promise time"
              value={data.promiseTime ? fmtDate(data.promiseTime) : "—"}
              muted={!data.promiseTime}
            />
            <RefRow label="Estimate outreach" value={outreach} muted={outreach === "Not sent"} />
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Parts pipeline</p>
            {partsTotal === 0 ? (
              <p className="text-[12px] text-muted-foreground">No part lines yet</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                <PartsPill label="Needed" count={data.partsNeeded} tone="bg-amber-500/10" />
                <PartsPill label="Quoted" count={data.partsQuoted} tone="bg-brand-light/25" />
                <PartsPill label="Ordered" count={data.partsOrdered} tone="bg-emerald-500/10" />
              </div>
            )}
          </div>

          {!hideVehicleSection ? (
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Car className="size-3" aria-hidden />
                Vehicle
              </p>
              <RefRow
                label="VIN #"
                value={data.vin ?? EMPTY}
                muted={!data.vin}
                mono={Boolean(data.vin)}
                title={data.vin ?? undefined}
              />
              <RefRow
                label="Plate #"
                value={data.plate ?? EMPTY}
                muted={!data.plate}
                mono={Boolean(data.plate)}
              />
              <RefRow
                label="State"
                value={data.plateState ?? EMPTY}
                muted={!data.plateState}
                mono={Boolean(data.plateState)}
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Wrench className="size-3" aria-hidden />
              Assignments
            </p>
            <RefRow
              label="RO technician"
              value={data.technicianName ?? "Unassigned"}
              muted={!data.technicianName}
            />
            <RefRow
              label="Jobs unassigned"
              value={String(data.unassignedJobs)}
              muted={data.unassignedJobs === 0}
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
