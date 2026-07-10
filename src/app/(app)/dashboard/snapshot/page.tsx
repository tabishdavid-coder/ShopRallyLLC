import { Suspense } from "react";

import { DailySnapshotView } from "@/components/dashboard/daily-snapshot-view";
import { parseSnapshotDay, snapshotDateForView } from "@/lib/daily-snapshot";
import { getShopId } from "@/lib/shop";
import { getDailySnapshot } from "@/server/daily-snapshot";
import { getDashboardHomeWidgets } from "@/server/dashboard-home";

export default async function DashboardSnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const sp = await searchParams;
  const dayView = parseSnapshotDay(sp.day);
  const shopId = await getShopId();
  const snapshotDate = snapshotDateForView(dayView);

  const [snapshot, widgets] = await Promise.all([
    getDailySnapshot(shopId, snapshotDate, dayView),
    getDashboardHomeWidgets(shopId),
  ]);

  return (
    <Suspense fallback={null}>
      <DailySnapshotView data={snapshot} widgets={widgets} shopId={shopId} />
    </Suspense>
  );
}
