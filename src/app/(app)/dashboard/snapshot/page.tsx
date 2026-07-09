import { Suspense } from "react";

import { ShopDayHeader } from "@/components/crm/home/shop-day-header";
import { DailySnapshotView } from "@/components/dashboard/daily-snapshot-view";
import { parseSnapshotDay, snapshotDateForView } from "@/lib/daily-snapshot";
import { getCurrentShop, getShopId } from "@/lib/shop";
import { getDailySnapshot } from "@/server/daily-snapshot";

export default async function DashboardSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const sp = await searchParams;
  const dayView = parseSnapshotDay(sp.day);
  const shopId = await getShopId();
  const snapshotDate = snapshotDateForView(dayView);

  const [shop, snapshot] = await Promise.all([
    getCurrentShop(),
    getDailySnapshot(shopId, snapshotDate, dayView),
  ]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Suspense fallback={null}>
      <div className="flex min-h-0 flex-col gap-3 overflow-auto pb-1">
        <ShopDayHeader shop={shop} todayLabel={todayLabel} />
        <DailySnapshotView data={snapshot} />
      </div>
    </Suspense>
  );
}
