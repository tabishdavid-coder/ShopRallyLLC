"use client";

import { useState, useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCents } from "@/lib/format";
import { fmtDateTime } from "@/lib/datetime";
import { requestStripeRefund } from "@/server/actions/payments";

export type PaymentHistoryRow = {
  id: string;
  method: string;
  amountCents: number;
  paidAt: string;
  reference: string | null;
  stripePaymentIntentId: string | null;
};

export function PaymentHistoryPanel({ payments }: { payments: PaymentHistoryRow[] }) {
  const [refundTarget, setRefundTarget] = useState<PaymentHistoryRow | null>(null);
  const [refundMessage, setRefundMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (payments.length === 0) return null;

  function openRefund(p: PaymentHistoryRow) {
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
      <div className="mt-6 rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/55">
          Payment history
        </h3>
        <div className="space-y-2 text-sm">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium capitalize">{p.method.toLowerCase()}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDateTime(p.paidAt)}
                  {p.reference ? ` · ${p.reference}` : ""}
                  {p.stripePaymentIntentId ? " · Stripe" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {p.stripePaymentIntentId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs text-muted-foreground hover:text-brand-navy"
                    onClick={() => openRefund(p)}
                  >
                    <RotateCcw className="size-3.5" />
                    Refund
                  </Button>
                ) : null}
                <span className="font-semibold tabular-nums text-emerald-700">
                  {formatCents(p.amountCents)}
                </span>
              </div>
            </div>
          ))}
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
                <span className="font-semibold tabular-nums">{formatCents(refundTarget.amountCents)}</span>{" "}
                from this Stripe Checkout payment?
              </p>
              <p className="text-xs text-muted-foreground">
                In-app refunds are not wired yet. Use this dialog for guidance until the Refunds API is
                connected.
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
