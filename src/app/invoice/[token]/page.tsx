import { notFound } from "next/navigation";

import { PayInvoiceButton } from "@/components/invoice/pay-invoice-button";
import { ServiceAdvisorCard } from "@/components/service-advisor-card";
import { InvoiceStatus } from "@/generated/prisma";
import { formatCents } from "@/lib/format";
import { isShopOnlinePaymentsEnabled } from "@/server/services/stripe-connect";
import { getInvoiceView } from "@/server/invoice";

export const metadata = { title: "Your invoice — ShopRally" };

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const view = await getInvoiceView(token);
  if (!view) notFound();

  const paid = view.totalCents - view.balanceCents;
  const isPaid = view.balanceCents <= 0 || view.status === InvoiceStatus.PAID;
  const stripeEnabled = await isShopOnlinePaymentsEnabled(view.shopId);
  const showPayButton = !isPaid && stripeEnabled && view.balanceCents > 0;

  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-brand-navy text-sm font-black leading-none text-white shadow-sm">
            <span>R</span>
            <span className="text-brand-red">P</span>
          </div>
          <span className="text-base font-bold tracking-tight">
            Kar<span className="text-brand-light">vio</span>
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="border-b pb-4">
            <p className="text-sm text-muted-foreground">{view.shopName}</p>
            <h1 className="mt-1 text-xl font-bold">Invoice #{view.number}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              RO #{view.roNumber} · {view.customerName} · {view.vehicleLabel}
            </p>
            {view.issuedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Issued {view.issuedAt.toLocaleDateString("en-US")}
              </p>
            ) : null}
            <ServiceAdvisorCard advisor={view.serviceAdvisor} compact className="mt-2" />
          </div>

          <div className="divide-y py-2">
            {view.jobs.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No line items on this invoice.</p>
            ) : (
              view.jobs.map((j) => (
                <div key={j.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium">{j.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.laborHours.toFixed(1)} hrs labor
                      {j.partsCents > 0 ? ` · parts ${formatCents(j.partsCents)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCents(j.totalCents)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5 border-t pt-4 text-sm">
            <Row label="Labor" value={formatCents(view.laborSubtotalCents)} />
            <Row label="Parts" value={formatCents(view.partsSubtotalCents)} />
            {view.shopSuppliesCents > 0 ? (
              <Row label="Shop supplies" value={formatCents(view.shopSuppliesCents)} />
            ) : null}
            {view.feesSubtotalCents > 0 ? (
              <Row label="Fees" value={formatCents(view.feesSubtotalCents)} />
            ) : null}
            {view.discountCents > 0 ? (
              <Row label="Discounts" value={formatCents(-view.discountCents)} />
            ) : null}
            <Row label="Subtotal" value={formatCents(view.subtotalCents)} />
            <Row label="Tax" value={formatCents(view.taxCents)} />
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatCents(view.totalCents)}</span>
            </div>
            {paid > 0 ? (
              <Row label="Paid" value={formatCents(-paid)} accent />
            ) : null}
            <div className="flex justify-between border-t pt-2 text-base font-bold text-brand-navy">
              <span>Balance due</span>
              <span className="tabular-nums">{formatCents(view.balanceCents)}</span>
            </div>
          </div>

          {query.paid === "1" ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {isPaid
                ? "Payment received — thank you! This invoice is marked paid."
                : "Payment submitted — your receipt will appear shortly once processing completes."}
            </div>
          ) : query.cancelled === "1" ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Payment was cancelled. You can try again when ready.
            </div>
          ) : null}

          {isPaid ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
              Paid in full
            </div>
          ) : showPayButton ? (
            <div className="mt-4 border-t pt-4">
              <PayInvoiceButton shareToken={token} balanceCents={view.balanceCents} />
            </div>
          ) : !stripeEnabled && view.balanceCents > 0 ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Online payment is not available yet. Contact {view.shopName} to pay this invoice.
            </p>
          ) : null}

          {view.payments.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment history
              </p>
              <div className="space-y-1 text-sm">
                {view.payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>
                      {p.paidAt.toLocaleDateString("en-US")} · {p.method}
                    </span>
                    <span className="tabular-nums text-foreground">{formatCents(p.amountCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Powered by ShopRally · Shop Management Software
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex justify-between ${accent ? "text-emerald-700" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${accent ? "" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
