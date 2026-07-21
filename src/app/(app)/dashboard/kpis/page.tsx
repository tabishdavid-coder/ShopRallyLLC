import { Suspense } from "react";

import { KpiDashboardView } from "@/components/dashboard/kpi-dashboard-view";
import { parseDashboardPeriod } from "@/lib/dashboard";
import { getCurrentShop, getShopId } from "@/lib/shop";
import { getDashboardData } from "@/server/dashboard";

export default async function DashboardKpisPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const sp = await searchParams;
  const period = parseDashboardPeriod(sp);
  const shopId = await getShopId();

  const [shop, dashboardData] = await Promise.all([
    getCurrentShop(),
    getDashboardData(shopId, period),
  ]);

  return (
    <Suspense fallback={null}>
      <KpiDashboardView data={dashboardData} shopName={shop.name} />
    </Suspense>
  );
}
