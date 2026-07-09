import { Suspense } from "react";

import { PlatformBillingOverview } from "@/components/platform/platform-billing-overview";
import { getShopId } from "@/lib/shop";
import { getPlatformBillingOverview } from "@/server/platform/billing";

export const metadata = { title: "Platform billing — ShopRally" };

type SearchParams = Promise<{ filter?: string }>;

export default async function PlatformBillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filter = params.filter as "all" | "trial" | "past_due" | "active" | "canceled" | undefined;
  const billing =
    filter === "trial" ||
    filter === "past_due" ||
    filter === "active" ||
    filter === "canceled"
      ? filter
      : "all";

  const [data, activeShopId] = await Promise.all([
    getPlatformBillingOverview({ billing }),
    getShopId(),
  ]);

  return (
    <Suspense fallback={null}>
      <PlatformBillingOverview data={data} activeShopId={activeShopId} />
    </Suspense>
  );
}
