"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  CreditCard,
  PenLine,
  MoreHorizontal,
  Store,
  Loader2,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { recordManualPayment, startStaffInvoiceCheckout } from "@/server/actions/payments";
import { ShareInvoiceDialog } from "@/components/repair-order/share-invoice-dialog";

type MethodKey = "CASH" | "CHECK" | "CARD" | "OTHER";

const METHODS: { key: MethodKey; label: string; icon: typeof DollarSign }[] = [
  { key: "CASH", label: "Cash", icon: DollarSign },
  { key: "CHECK", label: "Check", icon: PenLine },
  { key: "CARD", label: "Card", icon: CreditCard },
  { key: "OTHER", label: "Other", icon: MoreHorizontal },
];

const METHOD_BTN =
  "inline-flex h-9 min-w-[5.5rem] flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-brand-navy/35 hover:bg-brand-light/10 hover:text-brand-navy disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-muted/25 disabled:text-muted-foreground disabled:shadow-none sm:min-w-0 sm:flex-none sm:px-3";

export function PaymentMethodsPanel({
  repairOrderId,
  balanceDueCents,
  isPaid,
  stripeEnabled,
  invoiceId,
  invoiceNumber,
  customerFirstName,
  shopName,
  phones,
  email,
  embedded = false,
}: {
  repairOrderId: string;
  balanceDueCents: number;
  isPaid: boolean;
  stripeEnabled: boolean;
  invoiceId: string | null;
  invoiceNumber: number | null;
  customerFirstName: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
  /** When true, omit outer section label (parent panel provides chrome). */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [activeMethod, setActiveMethod] = useState<MethodKey | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pending, start] = useTransition();

  const methodsDisabled = isPaid || balanceDueCents <= 0;
  const storeCreditDisabled = balanceDueCents <= 0;

  function openMethod(method: MethodKey) {
    if (methodsDisabled) return;
    setError(null);
    setActiveMethod(method);
    setAmountStr((balanceDueCents / 100).toFixed(2));
    setReference("");
  }

  function closeDialog() {
    setActiveMethod(null);
    setError(null);
  }

  function parseAmountCents(): number | null {
    const n = Number.parseFloat(amountStr.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }

  function record(method: MethodKey) {
    const amountCents = parseAmountCents();
    if (!amountCents) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (amountCents > balanceDueCents) {
      setError(`Amount cannot exceed balance due (${formatCents(balanceDueCents)}).`);
      return;
    }

    setError(null);
    start(async () => {
      const res = await recordManualPayment({
        repairOrderId,
        method,
        amountCents,
        reference: reference.trim() || undefined,
      });
      if (res.ok) {
        closeDialog();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function startStripeCheckout() {
    setError(null);
    start(async () => {
      const res = await startStaffInvoiceCheckout(repairOrderId);
      if (res.ok) {
        window.location.href = res.url;
      } else {
        setError(res.error);
      }
    });
  }

  const methodLabel = METHODS.find((m) => m.key === activeMethod)?.label ?? "Payment";

  return (
    <>
      {!embedded ? (
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Payment method
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            disabled={methodsDisabled}
            onClick={() => openMethod(m.key)}
            className={METHOD_BTN}
          >
            <m.icon className="size-3.5 shrink-0 text-brand-navy/75" aria-hidden />
            {m.label}
          </button>
        ))}
        <button
          type="button"
          disabled
          title={
            storeCreditDisabled
              ? "Shop credit cannot be applied when the invoice is paid in full."
              : "Shop credit balance — coming soon"
          }
          className={cn(METHOD_BTN, "text-muted-foreground/70")}
        >
          <Store className="size-3.5 shrink-0 opacity-50" aria-hidden />
          Store credit
        </button>
      </div>

      {isPaid ? (
        <p className="mt-2 text-xs text-emerald-700">Paid in full — no further collection needed.</p>
      ) : storeCreditDisabled ? null : (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Store credit coming soon. Record cash, check, card, or other payments above.
        </p>
      )}

      <Dialog open={activeMethod !== null && activeMethod !== "CARD"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record {methodLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">
                Amount <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="pl-7 tabular-nums"
                  placeholder="0.00"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Balance due: {formatCents(balanceDueCents)}
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Reference (optional)</label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  activeMethod === "CHECK"
                    ? "Check #1234"
                    : activeMethod === "OTHER"
                      ? "Gift card, Zelle, etc."
                      : "Notes"
                }
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={closeDialog} disabled={pending}>
              Cancel
            </Button>
            <Button
              className="bg-brand-navy hover:bg-brand-navy/90"
              onClick={() => activeMethod && record(activeMethod)}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeMethod === "CARD"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Credit or Debit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Collect {formatCents(balanceDueCents)} by sending a pay link or recording an in-shop card payment.
            </p>

            {stripeEnabled ? (
              <>
                <Button
                  className="w-full justify-start gap-2 bg-brand-navy hover:bg-brand-navy/90"
                  onClick={startStripeCheckout}
                  disabled={pending}
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}
                  Pay with Stripe Checkout
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 border-brand-navy/30 text-brand-navy hover:bg-brand-light/15"
                  onClick={() => {
                    closeDialog();
                    setShareOpen(true);
                  }}
                  disabled={pending}
                >
                  <MessageSquare className="size-4" />
                  Text or email pay link
                </Button>
              </>
            ) : (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Stripe is not configured — connect in{" "}
                <a href="/payments/account" className="font-medium underline">
                  Payments → Account
                </a>{" "}
                so customers can pay online.
              </p>
            )}

            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/55">
                Record manual card payment
              </p>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Amount</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="pl-7 tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Reference</label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Visa ••4242, terminal receipt #"
                  />
                </div>
              </div>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={closeDialog} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="border-brand-navy/30 text-brand-navy"
              onClick={() => record("CARD")}
              disabled={pending}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Record payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareInvoiceDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        repairOrderId={repairOrderId}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        stripeEnabled={stripeEnabled}
        customerFirstName={customerFirstName}
        shopName={shopName}
        phones={phones}
        email={email}
      />
    </>
  );
}
