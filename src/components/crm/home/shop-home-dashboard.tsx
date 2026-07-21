"use client";

import { Download } from "lucide-react";

import { AppointmentsChart } from "@/components/dashboard/appointments-chart";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { PaymentMixChart } from "@/components/dashboard/payment-mix-chart";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RoStatusChart } from "@/components/dashboard/ro-status-chart";
import { HomeKpiStrip } from "@/components/crm/home/home-kpi-strip";
import { Button } from "@/components/ui/button";
import { exportDashboardSnapshot } from "@/lib/dashboard-export";
import type { DashboardData } from "@/lib/dashboard";

type ShopHomeDashboardProps = {
  data: DashboardData;
  shopName: string;
};

/** KPI strip + charts for the Dashboard overview. */
export function ShopHomeDashboard({ data, shopName }: ShopHomeDashboardProps) {
  const { rangeLabel } = data;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Performance · {rangeLabel}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DateRangePicker basePath="/dashboard/kpis" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5 text-xs"
            onClick={() => exportDashboardSnapshot(data, shopName)}
          >
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      <HomeKpiStrip data={data} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2">
        <RevenueChart data={data.revenueTrend} rangeLabel={rangeLabel} compact />
        <RoStatusChart data={data.roStatusBreakdown} compact />
        <AppointmentsChart
          data={data.appointmentsWeek}
          appointmentsThisWeek={data.kpis.appointmentsThisWeek}
          compact
        />
        <PaymentMixChart data={data.paymentMix} rangeLabel={rangeLabel} compact />
      </div>
    </div>
  );
}
