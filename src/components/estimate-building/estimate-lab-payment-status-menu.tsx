"use client";

import { Check, ChevronDown } from "lucide-react";

import { useEstimateLabDisplay, type EstimateLabPaymentPreview } from "@/components/estimate-building/estimate-lab-display-context";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { paymentStatusBadge, type PaymentDisplayStatus } from "@/lib/payment-status";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

const OPTIONS: {
  status: EstimateLabPaymentPreview;
  label: string;
  hint: string;
  mapsTo: PaymentDisplayStatus;
}[] = [
  { status: "UNPAID", label: "Unpaid", hint: "No payments shown", mapsTo: "unpaid" },
  { status: "PARTIAL", label: "Partial paid", hint: "50% of estimate total", mapsTo: "partial" },
  { status: "PAID", label: "Paid", hint: "Paid in full", mapsTo: "paid" },
];

export function PaymentAmounts({ paidCents, totalCents }: { paidCents: number; totalCents: number }) {
  if (totalCents <= 0) return null;
  return (
    <span className="min-w-0 truncate text-[11px] tabular-nums">
      <span className="font-semibold text-foreground">{formatCents(paidCents)}</span>
      <span className="text-muted-foreground"> of </span>
      <span className="font-semibold text-brand-navy">{formatCents(totalCents)}</span>
    </span>
  );
}

export function EstimateLabPaymentStatusMenu({
  canEdit,
  allowPreview = true,
  paidCents,
  totalCents,
  className,
  inline = false,
}: {
  canEdit: boolean;
  /** Design-mode-only "preview a payment status" override. Disabled on production ROs so the strip always reflects real invoice data. */
  allowPreview?: boolean;
  paidCents: number;
  totalCents: number;
  className?: string;
  /** Badge trigger only — amounts rendered by parent (e.g. right-rail status row). */
  inline?: boolean;
}) {
  const { paymentPreview, setPaymentPreview } = useEstimateLabDisplay();
  const badge = paymentStatusBadge(paidCents, totalCents);
  const isPreviewing = allowPreview && paymentPreview != null;

  const badgeTrigger = !canEdit || !allowPreview ? (
    <Badge variant="outline" className={cn("shrink-0 text-[11px] font-semibold", badge.className)}>
      {badge.label}
    </Badge>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={totalCents <= 0}>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40",
            badge.className,
            totalCents <= 0 && "cursor-not-allowed opacity-70",
          )}
          title={totalCents <= 0 ? "Add jobs before previewing payment status" : "Preview payment status (design mode)"}
        >
          {badge.label}
          <ChevronDown className="size-3 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Payment status · design mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((opt) => {
          const active = opt.mapsTo === badge.status;
          return (
            <DropdownMenuItem
              key={opt.status}
              className="flex flex-col items-start gap-0.5 py-2"
              onClick={() => setPaymentPreview(opt.status)}
            >
              <span className="flex w-full items-center gap-2 text-sm font-medium">
                {opt.label}
                {active ? <Check className="ml-auto size-3.5 text-brand-navy" /> : null}
              </span>
              <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (inline) {
    return <div className={cn("shrink-0", className)}>{badgeTrigger}</div>;
  }

  if (!canEdit || !allowPreview) {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
        {badgeTrigger}
        <PaymentAmounts paidCents={paidCents} totalCents={totalCents} />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-1.5", className)}>
      {badgeTrigger}
      <span className="flex min-w-0 items-center gap-1.5">
        <PaymentAmounts paidCents={paidCents} totalCents={totalCents} />
        {isPreviewing ? (
          <span
            className="shrink-0 rounded-sm bg-amber-100 px-1 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-amber-700"
            title="Design-mode preview — not written to the invoice"
          >
            Preview
          </span>
        ) : null}
      </span>
    </div>
  );
}
