import { notFound } from "next/navigation";

import { PayDepositButton } from "@/components/deposit/pay-deposit-button";
import { ServiceAdvisorCard } from "@/components/service-advisor-card";
import { DepositRequestStatus } from "@/generated/prisma";
import { formatCents } from "@/lib/format";
import { isShopOnlinePaymentsEnabled } from "@/server/services/stripe-connect";
import { getDepositRequestView } from "@/server/deposit-request";

export const metadata = { title: "Deposit request — ShopRally" };

export default async function DepositPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const view = await getDepositRequestView(token);
  if (!view) notFound();

  const isPaid = view.status === DepositRequestStatus.PAID || query.paid === "1";
  const stripeEnabled = await isShopOnlinePaymentsEnabled(view.shopId);
  const showPayButton = !isPaid && stripeEnabled && view.amountCents > 0;

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
            <h1 className="mt-1 text-xl font-bold text-brand-navy">Deposit request</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              RO #{view.roNumber} · {view.customerName} · {view.vehicleLabel}
            </p>
            <ServiceAdvisorCard advisor={view.serviceAdvisor} compact className="mt-2" />
          </div>

          <div className="space-y-3 py-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-muted-foreground">Amount due</span>
              <span className="text-2xl font-bold tabular-nums text-brand-navy">
                {formatCents(view.amountCents)}
              </span>
            </div>
            {view.note ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {view.note}
              </p>
            ) : null}
          </div>

          {isPaid ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
              Thank you — your deposit has been received.
              {view.paidAt ? (
                <p className="mt-1 text-xs font-normal text-emerald-700/80">
                  {view.paidAt.toLocaleString("en-US")}
                </p>
              ) : null}
            </div>
          ) : query.cancelled === "1" ? (
            <p className="text-center text-sm text-muted-foreground">
              Payment cancelled. You can try again when ready.
            </p>
          ) : showPayButton ? (
            <PayDepositButton shareToken={token} amountCents={view.amountCents} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Contact {view.shopName} to complete your deposit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
