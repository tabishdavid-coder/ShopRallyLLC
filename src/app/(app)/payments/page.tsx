import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ExpressDashboardButton } from "@/components/payments/express-dashboard-button";
import { formatCents } from "@/lib/format";
import { getPaymentsOverview } from "@/server/payments-overview";

export const dynamic = "force-dynamic";

export default async function PaymentsOverviewPage() {
  const overview = await getPaymentsOverview();

  return (
    <div className="space-y-5">
      {overview.actionRequired ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-medium text-amber-900">Action required</p>
              <p className="mt-0.5 text-sm text-amber-800">{overview.actionRequired}</p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-brand-navy hover:bg-brand-navy/90">
            <Link href="/payments/account">Go to Account</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross volume (30 days)" value={formatCents(overview.grossVolumeCents)} />
        <StatCard label="Total payments" value={String(overview.totalCount)} />
        <StatCard
          label="Stripe status"
          value={
            overview.stripeStatus.usingConnect
              ? "Connected"
              : overview.stripeStatus.canAcceptPayments
                ? "Dev fallback"
                : "Not connected"
          }
        />
      </div>

      <section className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-brand-navy px-2.5 py-1 text-xs font-medium text-white">
              Payments
            </span>
            <span className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Payouts
            </span>
          </div>
          {overview.stripeStatus.canOpenExpressDashboard ? (
            <ExpressDashboardButton />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {overview.recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No payments yet. Record cash/check/card on a repair order Payment tab, or share an
                    invoice pay link after connecting Stripe.
                  </td>
                </tr>
              ) : (
                overview.recentPayments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {p.paidAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Succeeded
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.source}
                      <span className="ml-1 text-xs">
                        · RO #{p.roNumber} · Inv #{p.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatCents(p.amountCents)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {overview.totalCount > 10 ? (
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing 1–10 of {overview.totalCount} results
          </p>
        ) : null}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
