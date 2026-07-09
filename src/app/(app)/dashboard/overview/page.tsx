import { Suspense } from "react";

import { CrmHomeView } from "@/components/crm/crm-home-view";
import { parseDashboardRange } from "@/lib/dashboard";
import { getCurrentShop, getShopId } from "@/lib/shop";
import { getDashboardData } from "@/server/dashboard";
import { getJobBoard } from "@/server/job-board";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseDashboardRange(sp.range);
  const shopId = await getShopId();

  const [shop, board, dashboardData] = await Promise.all([
    getCurrentShop(),
    getJobBoard({ shopId }),
    getDashboardData(shopId, range),
  ]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Suspense fallback={null}>
      <CrmHomeView
        shop={shop}
        board={board}
        dashboardData={dashboardData}
        todayLabel={todayLabel}
      />
    </Suspense>
  );
}
