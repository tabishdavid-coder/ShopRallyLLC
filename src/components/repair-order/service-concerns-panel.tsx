"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Wrench } from "lucide-react";

import { CustomerConcernDialog } from "@/components/repair-order/customer-concern-dialog";
import { TechnicianConcernDialog } from "@/components/repair-order/technician-concern-dialog";
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
  /** Lab estimate builder — clickable boxes, no header add buttons */
  variant?: "default" | "lab";
};

function ConcernList({
  items,
  empty,
  compact = false,
}: {
  items: ConcernRow[];
  empty: string;
  compact?: boolean;
}) {
  if (!items.length) {
    return <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{empty}</p>;
  }
  return (
    <ul className={cn(compact ? "space-y-1" : "space-y-2")}>
      {items.map((c) => (
        <li
          key={c.id}
          className={cn(
            "rounded-md border bg-background text-sm",
            compact ? "px-2 py-1.5 text-xs" : "px-3 py-2",
          )}
        >
          <p className="font-medium text-foreground">{c.text}</p>
          {c.finding ? (
            <p className={cn("mt-0.5 text-muted-foreground", compact && "text-[11px]")}>{c.finding}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ClickableConcernBox({
  label,
  items,
  emptyHint,
  compact = false,
  onAdd,
  onEdit,
}: {
  label: string;
  items: ConcernRow[];
  emptyHint: string;
  compact?: boolean;
  onAdd: () => void;
  onEdit: (concern: ConcernRow) => void;
}) {
  const boxClass = cn(
    "min-w-0 rounded-md border border-border/60 bg-background/80 transition-colors",
    compact ? "px-2.5 py-2" : "px-3 py-2.5",
  );

  if (!items.length) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className={cn(
          boxClass,
          "w-full cursor-pointer text-left hover:border-brand-navy/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <p className={cn("mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground")}>
          {label}
        </p>
        <p className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>{emptyHint}</p>
      </button>
    );
  }

  return (
    <div className={boxClass}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className={cn(compact ? "space-y-1" : "space-y-1.5")}>
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onEdit(c)}
              className={cn(
                "w-full cursor-pointer rounded-md border bg-background text-left transition-colors hover:border-brand-navy/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
              )}
            >
              <p className="font-medium text-foreground">{c.text}</p>
              {c.finding ? (
                <p className={cn("mt-0.5 text-muted-foreground", compact && "text-[11px]")}>{c.finding}</p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        className={cn(
          "mt-1.5 w-full cursor-pointer rounded-md border border-dashed border-border/80 text-left transition-colors hover:border-brand-navy/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
        )}
      >
        <span className="text-muted-foreground">{emptyHint}</span>
      </button>
    </div>
  );
}

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
  const [customerOpen, setCustomerOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ConcernRow | null>(null);
  const [editingTech, setEditingTech] = useState<ConcernRow | null>(null);

  function openCustomerDialog(concern?: ConcernRow | null) {
    setEditingCustomer(concern ?? null);
    setCustomerOpen(true);
  }

  function openTechDialog(concern?: ConcernRow | null) {
    setEditingTech(concern ?? null);
    setTechOpen(true);
  }

  function handleCustomerOpenChange(open: boolean) {
    setCustomerOpen(open);
    if (!open) setEditingCustomer(null);
  }

  function handleTechOpenChange(open: boolean) {
    setTechOpen(open);
    if (!open) setEditingTech(null);
  }

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
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openCustomerDialog()}>
                <Plus className="size-3" />
                Customer
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openTechDialog()}>
                <Wrench className="size-3" />
                Tech
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {isLab ? (
            <>
              <ClickableConcernBox
                label="Customer"
                items={customerConcerns}
                emptyHint="Click to add customer concern"
                compact
                onAdd={() => openCustomerDialog()}
                onEdit={openCustomerDialog}
              />
              <ClickableConcernBox
                label="Technician"
                items={technicianConcerns}
                emptyHint="Click to add technician finding"
                compact
                onAdd={() => openTechDialog()}
                onEdit={openTechDialog}
              />
            </>
          ) : (
            <>
              <div className="min-w-0 rounded-md border border-border/60 bg-background/80 px-2.5 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                <ConcernList items={customerConcerns} empty="No customer concerns yet." compact />
              </div>
              <div className="min-w-0 rounded-md border border-border/60 bg-background/80 px-2.5 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Technician</p>
                <ConcernList items={technicianConcerns} empty="No technician findings yet." compact />
              </div>
            </>
          )}
        </div>

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

        <CustomerConcernDialog
          open={customerOpen}
          onOpenChange={handleCustomerOpenChange}
          roId={roId}
          concern={editingCustomer}
        />
        <TechnicianConcernDialog
          open={techOpen}
          onOpenChange={handleTechOpenChange}
          roId={roId}
          concern={editingTech}
        />
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
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => openCustomerDialog()}>
              <Plus className="size-3.5" />
              Customer
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => openTechDialog()}>
              <Wrench className="size-3.5" />
              Tech
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {isLab ? (
          <>
            <ClickableConcernBox
              label="Customer"
              items={customerConcerns}
              emptyHint="Click to add customer concern"
              onAdd={() => openCustomerDialog()}
              onEdit={openCustomerDialog}
            />
            <ClickableConcernBox
              label="Technician"
              items={technicianConcerns}
              emptyHint="Click to add technician finding"
              onAdd={() => openTechDialog()}
              onEdit={openTechDialog}
            />
          </>
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
              <ConcernList items={customerConcerns} empty="No customer concerns yet." />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Technician</p>
              <ConcernList items={technicianConcerns} empty="No technician findings yet." />
            </div>
          </>
        )}
        <HistoryList rows={history} />
        {declined.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Declined</p>
            <HistoryList rows={declined} />
          </div>
        ) : null}
      </div>

      <CustomerConcernDialog
        open={customerOpen}
        onOpenChange={handleCustomerOpenChange}
        roId={roId}
        concern={editingCustomer}
      />
      <TechnicianConcernDialog
        open={techOpen}
        onOpenChange={handleTechOpenChange}
        roId={roId}
        concern={editingTech}
      />
    </section>
  );
}
