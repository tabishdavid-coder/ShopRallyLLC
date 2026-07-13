"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { PaymentMethodsPanel } from "@/components/repair-order/payment-methods-panel";
import { PaymentTransactionsPanel } from "@/components/repair-order/payment-transactions-panel";
import { PaymentInvoiceActions } from "@/components/repair-order/payment-invoice-actions";
import { formatCents } from "@/lib/format";
import { paymentMethodLabel, type PaymentRow } from "@/lib/payment-display";
import { useStripePaymentsUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

/** Client-safe RO payment snapshot for the Finance drawer panel (JSON-serialized). */
export type PaymentFinanceData = {
  repairOrderId: string;
  roNumber: number;
  roStatus: string;
  isPaid: boolean;
  invoiceStatus: string | null;
  balanceDueCents: number;
  stripeEnabled: boolean;
  invoiceId: string | null;
  invoiceNumber: number | null;
  shareUrl: string | null;
  customerFirstName: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
  laborSubtotalCents: number;
  feesSubtotalCents: number;
  subtotalCents: number;
  taxCents: number;
  grandTotalCents: number;
  totalPaidCents: number;
  /** Current RO payments — used in summary breakdown. */
  payments: PaymentRow[];
  /** All customer payments across ROs — used in payment history table. */
  customerPayments: PaymentRow[];
  failedCustomerPayments?: PaymentRow[];
};

function SummaryLine({
  label,
  value,
  bold,
  paid,
}: {
  label: string;
  value: number;
  bold?: boolean;
  paid?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 py-0.5 text-[13px]",
        bold ? "font-semibold text-foreground" : paid ? "text-brand-red" : "text-foreground/80",
      )}
    >
      <dt className="truncate">{label}</dt>
      <dd className="shrink-0 tabular-nums">{formatCents(value)}</dd>
    </div>
  );
}

/** Balance due + payment collection + history — embedded in the RO Finance drawer tab. */
export function PaymentFinancePanel({ data }: { data: PaymentFinanceData }) {
  const {
    repairOrderId,
    isPaid,
    balanceDueCents,
    stripeEnabled,
    invoiceId,
    invoiceNumber,
    shareUrl,
    customerFirstName,
    shopName,
    phones,
    email,
    laborSubtotalCents,
    feesSubtotalCents,
    subtotalCents,
    taxCents,
    grandTotalCents,
    totalPaidCents,
    payments,
    customerPayments,
    failedCustomerPayments = [],
  } = data;

  const stripeOnPlan = useStripePaymentsUiEnabled();
  const canStripeCheckout = stripeOnPlan && stripeEnabled;

  return (
    <div className="space-y-3 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-brand-navy">
            {stripeOnPlan ? "Collect payment" : "Record payment"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isPaid
              ? "This repair order is paid in full."
              : stripeOnPlan
                ? "Record in-shop payments or share an invoice link with the customer."
                : "Record cash, check, card, or other payments taken in the shop."}
          </p>
        </div>
        <div
          className={cn(
            "shrink-0 rounded-md border px-3 py-1.5 text-right",
            isPaid ? "border-emerald-200 bg-emerald-50" : "border-brand-navy/15 bg-brand-navy/[0.04]",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {isPaid ? "Paid in full" : "Balance due"}
          </p>
          <p
            className={cn(
              "text-lg font-bold tabular-nums leading-tight",
              isPaid ? "text-emerald-700" : "text-brand-navy",
            )}
          >
            {formatCents(isPaid ? 0 : balanceDueCents)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs leading-snug",
          canStripeCheckout
            ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-900"
            : stripeOnPlan
              ? "border-amber-200/80 bg-amber-50/80 text-amber-900"
              : "border-brand-navy/15 bg-brand-navy/[0.04] text-foreground/80",
        )}
      >
        {canStripeCheckout ? (
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        ) : (
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        )}
        <p>
          {canStripeCheckout ? (
            <>
              <span className="font-semibold">Stripe enabled.</span> Share invoice links or take card
              payments online. Cash and check still record below.
            </>
          ) : stripeOnPlan ? (
            <>
              Online card payments are off. Connect Stripe in{" "}
              <Link href="/marketing/payment-account" className="font-semibold text-brand-navy underline">
                Settings → Stripe
              </Link>{" "}
              for pay links. In-shop recording still works below.
            </>
          ) : (
            <>
              <span className="font-semibold">Manual payments only.</span> Record cash, check, card
              terminal, or other — online Stripe collection is not on Core.
            </>
          )}
        </p>
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Record payment
          </span>
          {!isPaid ? (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              Due {formatCents(balanceDueCents)}
            </span>
          ) : null}
        </div>

        <div className="px-3 py-2.5">
          <PaymentMethodsPanel
            embedded
            repairOrderId={repairOrderId}
            balanceDueCents={balanceDueCents}
            isPaid={isPaid}
            stripeEnabled={stripeEnabled}
            invoiceId={invoiceId}
            invoiceNumber={invoiceNumber}
            customerFirstName={customerFirstName}
            shopName={shopName}
            phones={phones}
            email={email}
          />
        </div>

        <PaymentTransactionsPanel
          embedded
          payments={customerPayments}
          failedPayments={failedCustomerPayments}
          customerWide
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/20 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </span>
        </div>

        <PaymentInvoiceActions
          repairOrderId={repairOrderId}
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          shareUrl={shareUrl}
          stripeEnabled={canStripeCheckout}
          customerFirstName={customerFirstName}
          shopName={shopName}
          phones={phones}
          email={email}
          compact
        />

        <dl className="space-y-0 px-3 py-2">
          <SummaryLine label="Labor" value={laborSubtotalCents} />
          {feesSubtotalCents > 0 ? <SummaryLine label="Fees" value={feesSubtotalCents} /> : null}
          <SummaryLine label="Subtotal" value={subtotalCents} />
          <SummaryLine label="Tax" value={taxCents} />
          <SummaryLine label="Total" value={grandTotalCents} bold />
          {totalPaidCents > 0 ? (
            <>
              <div className="my-1 border-t border-dashed border-border/80" />
              <SummaryLine label="Received" value={totalPaidCents} paid />
              {payments.map((p) => (
                <SummaryLine key={p.id} label={paymentMethodLabel(p.method)} value={-p.amountCents} paid />
              ))}
            </>
          ) : null}
        </dl>

        <div className="flex items-center justify-between border-t border-border bg-brand-navy/[0.04] px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">Balance due</span>
          <span
            className={cn(
              "text-base font-bold tabular-nums leading-none",
              balanceDueCents <= 0 ? "text-emerald-700" : "text-brand-navy",
            )}
          >
            {formatCents(balanceDueCents)}
          </span>
        </div>
      </section>
    </div>
  );
}
