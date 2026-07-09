"use client";

import { Suspense } from "react";

import { DesignModeDashboardCallout } from "@/components/design-mode/design-mode-dev-entry";
import { ShopDayHeader } from "@/components/crm/home/shop-day-header";
import { ShopHomeDashboard } from "@/components/crm/home/shop-home-dashboard";
import { StageProgress } from "@/components/crm/home/stage-progress";
import type { DashboardData } from "@/lib/dashboard";
import type { JobBoard } from "@/lib/job-board";
import type { Shop } from "@/lib/shop";

type CrmHomeViewProps = {
  shop: Shop;
  board: JobBoard;
  dashboardData: DashboardData;
  todayLabel: string;
};

/** CRM dashboard overview — single-viewport: pipeline, KPIs & charts. */
export function CrmHomeView({
  shop,
  board,
  dashboardData,
  todayLabel,
}: CrmHomeViewProps) {
  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-auto pb-1">
      <DesignModeDashboardCallout />
      <ShopDayHeader shop={shop} todayLabel={todayLabel} />

      <StageProgress board={board} compact />

      <Suspense fallback={null}>
        <ShopHomeDashboard data={dashboardData} shopName={shop.name} />
      </Suspense>
    </div>
  );
}
