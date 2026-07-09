"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Printer, Send } from "lucide-react";

import { formatCents } from "@/lib/format";
import { AuthorizeEstimateDialog } from "@/components/repair-order/authorize-estimate-dialog";
import { useEstimateSelection } from "@/components/repair-order/estimate-selection-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-crm-caption">{label}</span>
      <span className={bold ? "font-bold tabular-nums text-foreground" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

export function EstimateWorkflowSummary({
  roId,
  roNumber,
  customerName,
  phone,
  approvable,
  taxRateBps,
}: {
  roId: string;
  roNumber: number;
  customerName: string;
  phone: string | null;
  approvable: boolean;
  taxRateBps: number;
}) {
  const { totals } = useEstimateSelection();
  const [authorizeOpen, setAuthorizeOpen] = useState(false);
  const taxPct = (taxRateBps / 100).toFixed(2);

  return (
    <>
      <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-muted/20">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-crm-label">
            Estimate Summary
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <Row label="Labor" value={formatCents(totals.laborCents)} />
          <Row label="Parts" value={formatCents(totals.partsCents)} />
          <Row label="Fees" value={formatCents(totals.feesCents)} />
          <Row label="Discounts" value={formatCents(totals.discountsCents)} />
          <Separator />
          <Row label="Subtotal" value={formatCents(totals.subtotalCents)} />
          <Row label={`Tax (${taxPct}%)`} value={formatCents(totals.taxesCents)} />
          <Separator />
          <Row label="Estimate Total" value={formatCents(totals.totalCents)} bold />
          <p className="text-[11px] text-muted-foreground">
            GP {totals.gpPct.toFixed(1)}% · {formatCents(totals.gpCents)}
          </p>
        </div>
        <div className="space-y-2 border-t border-border p-4">
          {approvable ? (
            <Button
              type="button"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setAuthorizeOpen(true)}
            >
              <CheckCircle2 className="size-4" />
              Approve Estimate
            </Button>
          ) : (
            <Button type="button" variant="secondary" className="w-full" disabled>
              Authorized
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href={`/repair-orders/${roId}/estimate`}>
              <Send className="size-4" />
              Send Estimate
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/print/${roId}/estimate`} target="_blank">
              <Printer className="size-4" />
              Print / Export
            </Link>
          </Button>
        </div>
      </aside>

      <AuthorizeEstimateDialog
        open={authorizeOpen}
        onOpenChange={setAuthorizeOpen}
        roId={roId}
        roNumber={roNumber}
        customerName={customerName}
        phone={phone}
      />
    </>
  );
}
