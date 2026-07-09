"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  CreditCard,
  Loader2,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { subnavBarClass, subnavTabClass } from "@/lib/subnav-styles";
import { formatCents } from "@/lib/format";
import { fmtDateTime } from "@/lib/datetime";
import {
  paymentInfoText,
  paymentMethodLabel,
  paymentMethodSubLabel,
  type PaymentRow,
} from "@/lib/payment-display";
import { requestStripeRefund } from "@/server/actions/payments";

type TabKey = "transactions" | "failed";

export function PaymentTransactionsPanel({
  payments,
  failedPayments = [],
  embedded = false,
  /** When true, empty states and RO links reflect customer-wide history. */
  customerWide = false,
}: {
  payments: PaymentRow[];
  failedPayments?: PaymentRow[];
  /** Renders inside parent card — no outer top margin or duplicate border. */
  embedded?: boolean;
  customerWide?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("transactions");
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const succeeded = payments;
  const failed = failedPayments;
  const rows = tab === "transactions" ? succeeded : failed;

  function openRefund(p: PaymentRow) {
    setRefundMessage(null);
    setRefundTarget(p);
  }

  function closeRefund() {
    setRefundTarget(null);
    setRefundMessage(null);
  }

  function confirmRefund() {
    if (!refundTarget) return;
    setRefundMessage(null);
    start(async () => {
      const res = await requestStripeRefund(refundTarget.id);
      setRefundMessage(res.ok ? "Refund recorded." : res.error);
    });
  }

  return (
    <>
      <div className={cn(!embedded && "mt-5")}>
        <div className={cn(subnavBarClass(), "mb-0 gap-4 border-b-border px-1")}>
          {(
            [
              { key: "transactions" as const, label: "Payment history" },
              { key: "failed" as const, label: "Declined" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={subnavTabClass(tab === t.key, "px-1 pb-2 text-[10px] font-semibold uppercase tracking-wide")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "overflow-x-auto bg-card",
            embedded ? "border-t border-border" : "rounded-b-lg border border-t-0 border-border",
          )}
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-8 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  When
                </TableHead>
                <TableHead className="h-8 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="h-8 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Method
                </TableHead>
                <TableHead className="hidden h-8 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">
                  Reference
                </TableHead>
                <TableHead className="h-8 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="h-8 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="h-8 w-8 py-1.5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-xs text-muted-foreground">
                    {tab === "failed"
                      ? customerWide
                        ? "No declined or failed payments for this customer."
                        : "No failed transactions for this repair order."
                      : customerWide
                        ? "No payments recorded yet."
                        : "No payments recorded yet. Choose a method above to collect payment."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/20">
                    <TableCell className="whitespace-nowrap py-2 text-xs tabular-nums">
                      {fmtDateTime(p.paidAt)}
                    </TableCell>
                    <TableCell className="py-2 text-xs font-medium">{p.customerName}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        {p.method === "CARD" ? (
                          <CreditCard className="size-3.5 shrink-0 text-brand-navy/70" />
                        ) : null}
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight">{paymentMethodLabel(p.method)}</p>
                          <p className="truncate text-[10px] text-muted-foreground">
                            {paymentMethodSubLabel(p)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-[12rem] py-2 text-xs text-muted-foreground md:table-cell">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {p.roNumber != null && p.repairOrderId ? (
                          <Link
                            href={`/repair-orders/${p.repairOrderId}/estimate`}
                            className="w-fit truncate font-medium text-brand-navy hover:underline"
                          >
                            RO #{p.roNumber}
                          </Link>
                        ) : null}
                        <span className="truncate">{paymentInfoText(p)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold tabular-nums">
                      {formatCents(p.amountCents)}
                    </TableCell>
                    <TableCell className="py-2">
                      {p.status === "failed" || p.status === "declined" ? (
                        <span className="inline-flex rounded-full bg-brand-red/15 px-2 py-0.5 text-[10px] font-semibold text-brand-red">
                          Declined
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          Succeeded
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {p.stripePaymentIntentId ? (
                            <DropdownMenuItem onClick={() => openRefund(p)}>
                              <RotateCcw className="size-4" />
                              Refund payment
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled title="Manual payments cannot be refunded online">
                              Refund payment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={refundTarget !== null} onOpenChange={(o) => !o && closeRefund()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund Stripe payment</DialogTitle>
          </DialogHeader>
          {refundTarget ? (
            <div className="space-y-3 py-2 text-sm">
              <p>
                Refund{" "}
                <span className="font-semibold tabular-nums">
                  {formatCents(refundTarget.amountCents)}
                </span>{" "}
                from this Stripe Checkout payment?
              </p>
              <p className="text-xs text-muted-foreground">
                In-app refunds are not wired yet. Use this dialog for guidance until the Refunds API
                is connected.
              </p>
              {refundMessage ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  {refundMessage}
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={closeRefund} disabled={pending}>
              Close
            </Button>
            <Button
              variant="outline"
              className="border-brand-navy/30 text-brand-navy"
              onClick={confirmRefund}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              How to refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
