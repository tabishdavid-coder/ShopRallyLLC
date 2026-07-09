import { PaymentInvoiceActions } from "@/components/repair-order/payment-invoice-actions";
import { ApplyDiscountButton } from "@/components/repair-order/apply-discount-button";
import { ServiceAdvisorCard } from "@/components/service-advisor-card";
import { formatCents } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/payment-display";
import type { ServiceAdvisorInfo } from "@/lib/service-advisor";
import { cn } from "@/lib/utils";

type PaymentLine = {
  id: string;
  method: string;
  amountCents: number;
};

export function PaymentRoSummary({
  repairOrderId,
  roStatus,
  isPaid,
  invoiceStatus,
  balanceDue,
  laborSubtotalCents,
  feesSubtotalCents,
  subtotal,
  taxCents,
  grandTotal,
  totalPaid,
  payments,
  serviceAdvisor,
  invoiceId,
  invoiceNumber,
  shareUrl,
  stripeEnabled,
  customerFirstName,
  shopName,
  phones,
  email,
  className,
}: {
  repairOrderId: string;
  roStatus: string;
  isPaid: boolean;
  invoiceStatus: string | null | undefined;
  balanceDue: number;
  laborSubtotalCents: number;
  feesSubtotalCents: number;
  subtotal: number;
  taxCents: number;
  grandTotal: number;
  totalPaid: number;
  payments: PaymentLine[];
  serviceAdvisor: ServiceAdvisorInfo;
  invoiceId: string | null;
  invoiceNumber: number | null;
  shareUrl: string | null;
  stripeEnabled: boolean;
  customerFirstName: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
  className?: string;
}) {
  return (
    <aside className={cn("lg:sticky lg:top-3 lg:self-start", className)}>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/20 px-2.5 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Summary
          </span>
          {isPaid ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              Paid
            </span>
          ) : invoiceStatus ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {invoiceStatus.replace("_", " ")}
            </span>
          ) : null}
        </div>

        <div className="border-b border-border px-2.5 py-2">
          <ServiceAdvisorCard advisor={serviceAdvisor} compact />
        </div>

        <PaymentInvoiceActions
          repairOrderId={repairOrderId}
          invoiceId={invoiceId}
          invoiceNumber={invoiceNumber}
          shareUrl={shareUrl}
          stripeEnabled={stripeEnabled}
          customerFirstName={customerFirstName}
          shopName={shopName}
          phones={phones}
          email={email}
          compact
        />

        <dl className="space-y-0 px-2.5 py-1.5 text-xs">
          <SummaryLine label="Labor" value={laborSubtotalCents} />
          {feesSubtotalCents > 0 ? <SummaryLine label="Fees" value={feesSubtotalCents} /> : null}
          <SummaryLine label="Subtotal" value={subtotal} />
          <SummaryLine label="Tax" value={taxCents} />
          <SummaryLine label="Total" value={grandTotal} bold />

          {totalPaid > 0 ? (
            <>
              <div className="my-1 border-t border-dashed border-border/80" />
              <SummaryLine label="Received" value={totalPaid} paid />
              {payments.map((p) => (
                <SummaryLine
                  key={p.id}
                  label={paymentMethodLabel(p.method)}
                  value={-p.amountCents}
                  paid
                  indent
                />
              ))}
            </>
          ) : null}
        </dl>

        <div className="flex items-center justify-between border-t border-border bg-brand-navy/[0.04] px-2.5 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-foreground">
            Balance due
          </span>
          <span
            className={cn(
              "text-base font-bold tabular-nums leading-none",
              balanceDue <= 0 ? "text-emerald-700" : "text-brand-navy",
            )}
          >
            {formatCents(balanceDue)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
          <ApplyDiscountButton repairOrderId={repairOrderId} disabled={isPaid} compact />
          <button
            type="button"
            disabled
            title={
              roStatus === "COMPLETED" && isPaid
                ? "Post repair order to accounting — coming soon"
                : "Available when the repair order is completed and paid in full"
            }
            className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-brand-navy/20 bg-brand-navy/90 px-2 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            Sync accounting
          </button>
        </div>
      </div>
    </aside>
  );
}

function SummaryLine({
  label,
  value,
  bold,
  paid,
  indent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  paid?: boolean;
  indent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 py-0.5",
        indent && "pl-2",
        bold ? "font-semibold text-foreground" : paid ? "text-brand-red" : "text-foreground/80",
      )}
    >
      <dt className={cn("truncate", bold ? "font-semibold" : paid ? "font-medium" : undefined)}>
        {label}
      </dt>
      <dd className={cn("shrink-0 tabular-nums", bold ? "font-semibold" : paid ? "font-semibold" : "")}>
        {formatCents(value)}
      </dd>
    </div>
  );
}
