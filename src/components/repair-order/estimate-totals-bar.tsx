"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";

import { formatCents } from "@/lib/format";
import { AuthorizeEstimateDialog } from "@/components/repair-order/authorize-estimate-dialog";
import { cn } from "@/lib/utils";

function BarMetric({
  label,
  value,
  discount,
  icon,
  className,
}: {
  label: string;
  value: string;
  discount?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center justify-center px-1 py-1.5 text-center", className)}>
      <div
        className={cn(
          "flex w-full min-w-0 items-center justify-center gap-0.5 text-[9px] font-semibold uppercase tracking-wide leading-none",
          discount ? "text-brand-red/80" : "text-white/55",
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "mt-0.5 w-full min-w-0 truncate text-[11px] font-semibold tabular-nums leading-tight sm:text-xs",
          discount && "text-brand-red",
          !discount && "text-white/90",
        )}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Sticky estimate footer — revenue breakdown + primary actions.
 * Contained to the main column (no negative margins) so it never bleeds into a right rail.
 */
export function EstimateTotalsBar({
  roId,
  roNumber,
  customerName,
  phone,
  approvable,
  gpPct: _gpPct,
  gpCents: _gpCents,
  laborCents,
  partsCents,
  partsCount,
  subletCents: _subletCents,
  feesCents,
  discountsCents,
  subtotalCents,
  taxesCents,
  gpGoalCents: _gpGoalCents,
  totalCents,
  beforeApproveAction,
}: {
  roId: string;
  roNumber: number;
  customerName: string;
  phone: string | null;
  approvable: boolean;
  gpPct: number;
  gpCents: number;
  laborCents: number;
  partsCents: number;
  partsCount: number;
  subletCents: number;
  feesCents: number;
  discountsCents: number;
  subtotalCents: number;
  taxesCents: number;
  gpGoalCents?: number | null;
  totalCents: number;
  /** Optional slot before Get approval (e.g. estimate lab deposit request). */
  beforeApproveAction?: ReactNode;
}) {
  const [authorizeOpen, setAuthorizeOpen] = useState(false);

  return (
    <>
      <div
        id="estimate-totals-bar"
        className="@container/totals sticky bottom-0 z-10 mt-3 w-full max-w-full overflow-hidden rounded-t-lg bg-brand-navy text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)]"
      >
        <div className="flex min-w-0 items-stretch">
          {/* Line breakdown — 6 cols; total lives with actions so values don't truncate */}
          <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-white/10 sm:grid-cols-6">
            <BarMetric label="Labor" value={formatCents(laborCents)} />
            <BarMetric
              label="Parts"
              value={formatCents(partsCents)}
              icon={
                partsCount > 0 ? (
                  <span className="relative mr-0.5 inline-flex shrink-0" aria-hidden>
                    <ShoppingCart className="size-2.5" />
                    <span className="absolute -right-1 -top-1 flex size-2.5 items-center justify-center rounded-full bg-brand-red text-[6px] font-bold leading-none text-white">
                      {partsCount}
                    </span>
                  </span>
                ) : null
              }
            />
            <BarMetric label="Fees" value={formatCents(feesCents)} />
            <BarMetric
              label="Disc."
              value={discountsCents > 0 ? `−${formatCents(discountsCents)}` : formatCents(0)}
              discount={discountsCents > 0}
            />
            <BarMetric label="Subtotal" value={formatCents(subtotalCents)} />
            <BarMetric label="Tax" value={formatCents(taxesCents)} />
          </div>

          {/* Total + CTAs — pinned right, horizontal on wide containers */}
          <div className="flex shrink-0 items-center gap-2 border-l border-white/15 px-2 py-1.5 @md/totals:gap-2.5 @md/totals:px-3">
            <div className="shrink-0 text-right leading-tight">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-white/55">Total</div>
              <div className="whitespace-nowrap text-sm font-bold tabular-nums @md/totals:text-base">
                {formatCents(totalCents)}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-1 @md/totals:flex-row @md/totals:items-center">
              {beforeApproveAction ? (
                <div className="[&_button]:h-7 [&_button]:whitespace-nowrap [&_button]:rounded-md [&_button]:px-2 [&_button]:text-[11px] [&_button]:font-semibold @md/totals:[&_button]:h-8 @md/totals:[&_button]:px-2.5 @md/totals:[&_button]:text-xs">
                  {beforeApproveAction}
                </div>
              ) : null}
              {approvable ? (
                <button
                  type="button"
                  onClick={() => setAuthorizeOpen(true)}
                  className="flex h-7 shrink-0 items-center justify-center gap-1 rounded-md bg-brand-light px-2 text-[11px] font-semibold text-brand-navy transition-colors hover:bg-brand-light/90 @md/totals:h-8 @md/totals:px-2.5 @md/totals:text-xs"
                >
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
                  <span className="hidden @md/totals:inline">Get approval</span>
                  <span className="@md/totals:hidden">Approve</span>
                </button>
              ) : (
                <span className="flex h-7 shrink-0 items-center justify-center rounded-md bg-white/10 px-2 text-[11px] font-semibold text-white/80 @md/totals:h-8 @md/totals:px-2.5 @md/totals:text-xs">
                  Authorized
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

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
