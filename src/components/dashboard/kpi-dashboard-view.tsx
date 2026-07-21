"use client";

import {
  CalendarPlus,
  Car,
  CircleDollarSign,
  Download,
  DollarSign,
  Gauge,
  Package,
  Percent,
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
import { exportDashboardSnapshot } from "@/lib/dashboard-export";
import {
  collectionRatePct,
  partsLaborMixPct,
  type DashboardData,
} from "@/lib/dashboard";
import { formatCents } from "@/lib/format";

type KpiDashboardViewProps = {
  data: DashboardData;
  shopName: string;
};

/** High-level shop performance dashboard (sales, conversion, mix). */
export function KpiDashboardView({ data, shopName }: KpiDashboardViewProps) {
  const { kpis, rangeLabel } = data;
  const collectionRate = collectionRatePct(kpis.invoicedCents, kpis.collectedCents);
  const partsMix = partsLaborMixPct(kpis.partsSalesCents, kpis.laborSalesCents);
  const laborMix = partsMix !== null ? 100 - partsMix : null;

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy/70">
            Performance
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy">KPIs</h1>
          <p className="text-sm text-muted-foreground">
            Sales and shop health for {rangeLabel.toLowerCase()}. Figures use recorded
            payments and completed repair orders.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DateRangePicker basePath="/dashboard/kpis" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => exportDashboardSnapshot(data, shopName)}
          >
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <KpiCard
          label="Sales (collected)"
          value={formatCents(kpis.collectedCents)}
          hint={
            kpis.invoicedCents > 0
              ? `${formatCents(kpis.invoicedCents)} invoiced · ${rangeLabel}`
              : `Payments recorded · ${rangeLabel}`
          }
          icon={DollarSign}
          tint="bg-emerald-100 text-emerald-600"
          current={kpis.grossVolumeCents}
          prior={kpis.grossVolumePriorCents}
          formatTrend="money"
          sparkline={data.revenueTrend}
          sparklineIsMoney
        />
        <KpiCard
          label="Average RO"
          value={kpis.aroCents > 0 ? formatCents(kpis.aroCents) : "—"}
          hint="Avg completed RO total"
          icon={TrendingUp}
          tint="bg-brand-light/30 text-brand-navy"
          current={kpis.aroCents}
          prior={kpis.aroPriorCents}
          formatTrend="money"
        />
        <KpiCard
          label="ROs completed"
          value={String(kpis.completedInPeriod)}
          hint={`${rangeLabel} car count`}
          icon={Wrench}
          tint="bg-amber-100 text-amber-600"
          current={kpis.completedInPeriod}
          prior={kpis.completedPrior}
        />
        <KpiCard
          label="Estimate conversion"
          value={
            kpis.estimateConversionPct !== null ? `${kpis.estimateConversionPct}%` : "—"
          }
          hint={
            kpis.estimatesCreatedInPeriod > 0
              ? `${kpis.estimatesApprovedInPeriod} approved · ${kpis.estimatesPendingInPeriod} still pending · ${kpis.estimatesCreatedInPeriod} opened`
              : "No ROs opened in period"
          }
          icon={Percent}
          tint="bg-brand-light/40 text-brand-navy"
        />
        <KpiCard
          label="Appointments booked"
          value={String(kpis.appointmentsBookedInPeriod)}
          hint={`${kpis.appointmentsToday} on calendar today`}
          icon={CalendarPlus}
          tint="bg-brand-light/40 text-brand-navy"
        />
        <KpiCard
          label="Parts vs labor"
          value={
            partsMix !== null
              ? `${partsMix}% / ${laborMix}%`
              : "—"
          }
          hint={
            partsMix !== null
              ? `${formatCents(kpis.partsSalesCents)} parts · ${formatCents(kpis.laborSalesCents)} labor`
              : "No completed RO sales in period"
          }
          icon={Package}
          tint="bg-brand-red/10 text-brand-red"
        />
        <KpiCard
          label="Cars in shop"
          value={String(kpis.carsInShop)}
          hint={`${kpis.estimatesCount} estimates · ${kpis.wipCount} WIP`}
          icon={Car}
          tint="bg-brand-light/40 text-brand-navy"
        />
        <KpiCard
          label="Outstanding AR"
          value={formatCents(kpis.outstandingArCents)}
          hint={
            collectionRate !== null
              ? `${collectionRate}% collection rate this period`
              : "Open invoice balances"
          }
          icon={CircleDollarSign}
          tint="bg-rose-100 text-rose-600"
        />
        <KpiCard
          label="Open ROs"
          value={String(kpis.openRoCount)}
          hint="Estimates + approved / in progress"
          icon={Receipt}
          tint="bg-brand-red/10 text-brand-red"
        />
        <KpiCard
          label="Collection rate"
          value={collectionRate !== null ? `${collectionRate}%` : "—"}
          hint={
            kpis.invoicedCents > 0
              ? `${formatCents(kpis.collectedCents)} of ${formatCents(kpis.invoicedCents)} invoiced`
              : "No invoices issued in period"
          }
          icon={Gauge}
          tint="bg-emerald-100 text-emerald-600"
        />
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
    </div>
  );
}
