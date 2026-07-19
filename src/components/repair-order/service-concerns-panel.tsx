"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Wrench } from "lucide-react";

import { InlineConcernSection } from "@/components/repair-order/inline-concern-editor";
import type { ConcernRow } from "@/components/repair-order/concern-types";
import type { HistoryRow } from "@/server/job-history";
import type { ROStatus } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";

export type { ConcernRow };

export type ApprovalState = {
  sentAt: Date | null;
  viewedAt: Date | null;
  authorizedAt: Date | null;
  approvedVia: string | null;
};

type Props = {
  roId: string;
  customerConcerns: ConcernRow[];
  technicianConcerns: ConcernRow[];
  history: HistoryRow[];
  declined: HistoryRow[];
  approval: ApprovalState;
  roStatus?: ROStatus;
  embedded?: boolean;
  layout?: "rail" | "stacked" | "banner";
  /** Lab estimate builder — clickable inline editors, no header add buttons */
  variant?: "default" | "lab";
};

function HistoryList({ rows }: { rows: HistoryRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vehicle history</p>
      <ul className="space-y-1.5">
        {rows.slice(0, 5).map((row) => (
          <li key={row.id} className="text-xs text-muted-foreground">
            <Link href={`/repair-orders/${row.roId}/estimate`} className="font-medium text-brand-navy hover:underline">
              RO #{row.roNumber}
            </Link>
            {" · "}
            {row.jobName} · {formatCents(row.totalCents)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ServiceConcernsPanel({
  roId,
  customerConcerns,
  technicianConcerns,
  history,
  declined,
  approval,
  embedded = false,
  layout = "stacked",
  variant = "default",
}: Props) {
  const isLab = variant === "lab";
  const [customerAddSignal, setCustomerAddSignal] = useState(0);
  const [techAddSignal, setTechAddSignal] = useState(0);

  const shellClass = cn(
    embedded ? "min-w-0" : "rounded-lg border border-border bg-card shadow-sm",
    layout === "rail" && "border-r bg-muted/20 p-3 md:max-w-xs",
    layout === "stacked" && "p-4",
    layout === "banner" && "border-b border-border bg-muted/15 px-3 py-2.5",
  );

  const approvalHint = approval.authorizedAt ? (
    <span className="text-xs text-emerald-700">Approved {approval.approvedVia ?? "by shop"}</span>
  ) : approval.sentAt ? (
    <span className="text-xs text-muted-foreground">
      Sent for approval{approval.viewedAt ? " · viewed" : ""}
    </span>
  ) : null;

  const concernColumns = (
    <>
      <InlineConcernSection
        roId={roId}
        kind="CUSTOMER"
        label="Customer"
        items={customerConcerns}
        emptyHint="Click to add customer concern"
        compact={layout === "banner"}
        addSignal={customerAddSignal}
      />
      <InlineConcernSection
        roId={roId}
        kind="TECHNICIAN"
        label="Technician"
        items={technicianConcerns}
        emptyHint="Click to add technician finding"
        compact={layout === "banner"}
        addSignal={techAddSignal}
      />
    </>
  );

  if (layout === "banner") {
    const hasHistory = history.length > 0 || declined.length > 0;

    return (
      <section className={shellClass}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-brand-navy">
              <ClipboardList className="size-3.5 text-brand-light" />
              Service concerns
            </h3>
            {approvalHint}
          </div>
          {!isLab ? (
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setCustomerAddSignal((n) => n + 1)}
              >
                <Plus className="size-3" />
                Customer
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => setTechAddSignal((n) => n + 1)}
              >
                <Wrench className="size-3" />
                Tech
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{concernColumns}</div>

        {hasHistory ? (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
            {history.length ? (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-semibold uppercase tracking-wide">History</span>
                {history.slice(0, 3).map((row) => (
                  <Link
                    key={row.id}
                    href={`/repair-orders/${row.roId}/estimate`}
                    className="text-brand-navy hover:underline"
                  >
                    RO #{row.roNumber} · {row.jobName}
                  </Link>
                ))}
              </div>
            ) : null}
            {declined.length ? (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span className="font-semibold uppercase tracking-wide text-amber-700">Declined</span>
                {declined.slice(0, 2).map((row) => (
                  <Link
                    key={row.id}
                    href={`/repair-orders/${row.roId}/estimate`}
                    className="text-brand-navy hover:underline"
                  >
                    RO #{row.roNumber}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={shellClass}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
            <ClipboardList className="size-4 text-brand-light" />
            Service concerns
          </h3>
          {approval.authorizedAt ? (
            <p className="mt-1 text-xs text-emerald-700">Approved {approval.approvedVia ?? "by shop"}</p>
          ) : approval.sentAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Sent for approval{approval.viewedAt ? " · viewed" : ""}
            </p>
          ) : null}
        </div>
        {!isLab ? (
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setCustomerAddSignal((n) => n + 1)}
            >
              <Plus className="size-3.5" />
              Customer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => setTechAddSignal((n) => n + 1)}
            >
              <Wrench className="size-3.5" />
              Tech
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {concernColumns}
        <HistoryList rows={history} />
        {declined.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Declined</p>
            <HistoryList rows={declined} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
