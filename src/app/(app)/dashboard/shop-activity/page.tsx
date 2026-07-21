import { Suspense } from "react";

import { ActivityFeedView } from "@/components/dashboard/activity-feed-view";
import { getShopId } from "@/lib/shop";
import { getActivityFeed } from "@/server/activity-feed";

function categoryQueryParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value.join(",") : value;
}

export default async function DashboardShopActivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    period?: string;
    from?: string;
    to?: string;
    q?: string;
    category?: string | string[];
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const shopId = await getShopId();
  const data = await getActivityFeed(shopId, {
    range: sp.range,
    period: sp.period,
    from: sp.from,
    to: sp.to,
    q: sp.q,
    category: categoryQueryParam(sp.category),
    page: sp.page,
  });

  return (
    <Suspense fallback={null}>
      <ActivityFeedView data={data} />
    </Suspense>
  );
}
