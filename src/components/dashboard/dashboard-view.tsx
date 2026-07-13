"use client";

import {
  Car,
  Calendar,
  CircleDollarSign,
  Download,
  DollarSign,
  Receipt,
  TrendingUp,
  Wrench,
} from "lucide-react";

import { AppointmentsChart } from "@/components/dashboard/appointments-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PaymentMixChart } from "@/components/dashboard/payment-mix-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RoStatusChart } from "@/components/dashboard/ro-status-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportDashboardSnapshot } from "@/lib/dashboard-export";
import { collectionRatePct, type DashboardData } from "@/lib/dashboard";
import { formatCents } from "@/lib/format";
import { useStripePaymentsUiEnabled } from "@/lib/shop-capabilities";
import type { StripeConfigStatus } from "@/lib/stripe";

type DashboardViewProps = {
  data: DashboardData;
  shopName: string;
  stripe: StripeConfigStatus;
};

export function DashboardView({ data, shopName, stripe }: DashboardViewProps) {
  const { kpis, rangeLabel } = data;
  const collectionRate = collectionRatePct(kpis.invoicedCents, kpis.collectedCents);
  const stripeOnPlan = useStripePaymentsUiEnabled();

  const paymentsHint = !stripeOnPlan
    ? "Record cash, check, card, or other"
    : !stripe.enabled
      ? "Add Stripe in Settings → Integrations"
      : kpis.grossVolumeCents > 0
        ? "Stripe + recorded payments"
        : "Record payments or share an invoice";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <DateRangePicker />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => exportDashboardSnapshot(data, shopName)}
        >
          <Download className="size-3.5" />
          Export dashboard
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Cars in shop"
          value={String(kpis.carsInShop)}
          hint="Approved + in progress"
          icon={Car}
          tint="bg-brand-light/40 text-brand-navy"
        />
        <KpiCard
          label="Gross volume"
          value={formatCents(kpis.grossVolumeCents)}
          hint={paymentsHint}
          icon={DollarSign}
          tint="bg-emerald-100 text-emerald-600"
          current={kpis.grossVolumeCents}
          prior={kpis.grossVolumePriorCents}
          formatTrend="money"
          sparkline={data.revenueTrend}
          sparklineIsMoney
        />
        <KpiCard
          label="Open ROs"
          value={String(kpis.openRoCount)}
          hint={`${kpis.estimatesCount} estimates · ${kpis.wipCount} WIP`}
          icon={Receipt}
          tint="bg-brand-red/10 text-brand-red"
        />
        <KpiCard
          label="Completed"
          value={String(kpis.completedInPeriod)}
          hint={`${rangeLabel} throughput`}
          icon={Wrench}
          tint="bg-amber-100 text-amber-600"
          current={kpis.completedInPeriod}
          prior={kpis.completedPrior}
        />
        <KpiCard
          label="ARO"
          value={kpis.aroCents > 0 ? formatCents(kpis.aroCents) : "—"}
          hint="Avg completed RO value"
          icon={TrendingUp}
          tint="bg-brand-light/30 text-brand-navy"
          current={kpis.aroCents}
          prior={kpis.aroPriorCents}
          formatTrend="money"
        />
        <KpiCard
          label="Outstanding AR"
          value={formatCents(kpis.outstandingArCents)}
          hint="Open invoice balances"
          icon={CircleDollarSign}
          tint="bg-rose-100 text-rose-600"
        />
        <KpiCard
          label="Appointments"
          value={String(kpis.appointmentsToday)}
          hint={`${kpis.appointmentsThisWeek} this week`}
          icon={Calendar}
          tint="bg-brand-light/40 text-brand-navy"
        />
        <KpiCard
          label="Collection rate"
          value={collectionRate !== null ? `${collectionRate}%` : "—"}
          hint={
            kpis.invoicedCents > 0
              ? `${formatCents(kpis.collectedCents)} of ${formatCents(kpis.invoicedCents)} invoiced`
              : "No invoices issued in period"
          }
          icon={TrendingUp}
          tint="bg-emerald-100 text-emerald-600"
        />
        {kpis.tireOrdersPending > 0 ? (
          <KpiCard
            label="Tire orders"
            value={String(kpis.tireOrdersPending)}
            hint="Pending supplier approval"
            icon={Receipt}
            tint="bg-brand-red/10 text-brand-red"
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={data.revenueTrend} rangeLabel={rangeLabel} />
        <RoStatusChart data={data.roStatusBreakdown} />
        <AppointmentsChart
          data={data.appointmentsWeek}
          appointmentsThisWeek={kpis.appointmentsThisWeek}
        />
        <PaymentMixChart data={data.paymentMix} rangeLabel={rangeLabel} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{stripeOnPlan ? "Collect payment" : "Record payment"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {stripeOnPlan ? (
            <>
              <p>
                Open a completed repair order → Payment tab → Share invoice with customer. Record cash, check, or card
                in-shop anytime; customers pay online when Stripe is configured.
              </p>
              {stripe.enabled ? (
                <p>
                  With Stripe: public invoice link → Pay invoice → test card{" "}
                  <span className="font-mono text-xs">4242 4242 4242 4242</span>. Gross volume updates when payments
                  succeed.
                </p>
              ) : (
                <p>
                  <a href="/marketing/payment-account" className="font-medium text-brand-navy hover:underline">
                    Set up Stripe
                  </a>{" "}
                  to enable Pay invoice on shared links and Stripe Checkout from the Payment tab.
                </p>
              )}
            </>
          ) : (
            <p>
              Open a repair order → Payment → record cash, check, card (terminal), or other. Online Stripe
              collection is not included on Core.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
