"use client";

import Link from "next/link";
import {
  Calendar,
  Car,
  Columns3,
  DollarSign,
  LayoutDashboard,
  Receipt,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { RoStatusChart } from "@/components/dashboard/ro-status-chart";
import { Button } from "@/components/ui/button";
import type { DashboardData } from "@/lib/dashboard";
import { formatCents } from "@/lib/format";
import type { Shop } from "@/lib/shop";

/** Compact dashboard strip from legacy :3000 /dashboard — sits above the job board landing. */
export function DashboardPulse({
  shop,
  data,
}: {
  shop: Shop;
  data: DashboardData;
}) {
  const { kpis, rangeLabel } = data;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border-l-4 border-brand-light bg-gradient-to-r from-brand-navy to-brand-red p-5 text-primary-foreground shadow-sm">
        <span className="absolute right-4 top-4 rounded-full bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-light-foreground">
          {today}
        </span>
        <div className="flex flex-col gap-3 pr-24 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">
              Job board landing
            </p>
            <h2 className="text-xl font-bold tracking-tight">{shop.name}</h2>
            <p className="mt-1 text-sm text-primary-foreground/80">
              {rangeLabel} · {kpis.carsInShop} cars in shop · {kpis.openRoCount} open
              ROs · {kpis.appointmentsToday} appointments today
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="secondary"
            className="shrink-0 gap-1.5 bg-white/15 text-white hover:bg-white/25"
          >
            <Link href="/dashboard">
              <LayoutDashboard className="size-3.5" />
              Full dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
            hint={`${rangeLabel} collected`}
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
            label="Appointments"
            value={String(kpis.appointmentsToday)}
            hint={`${kpis.appointmentsThisWeek} this week`}
            icon={Calendar}
            tint="bg-brand-light/40 text-brand-navy"
          />
        </div>
        <div className="hidden lg:block">
          <RoStatusChart data={data.roStatusBreakdown} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:hidden">
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/job-board">
            <Columns3 className="size-3.5" />
            Classic job board
          </Link>
        </Button>
      </div>
    </div>
  );
}
