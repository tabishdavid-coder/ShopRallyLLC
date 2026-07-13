import { redirect } from "next/navigation";

import { BillingModule } from "@/components/billing/billing-module";
import { getShopId } from "@/lib/shop";
import { getBillingOverview } from "@/server/billing";
import type { PlanFeature } from "@/lib/plans";

export const metadata = { title: "Subscription — Shop Settings" };
export const dynamic = "force-dynamic";

export default async function SubscriptionSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const shopId = await getShopId();
  const overview = await getBillingOverview(shopId);
  const q = await searchParams;
  const upgradeFeature = q.upgrade && isPlanFeature(q.upgrade) ? q.upgrade : null;

  return <BillingModule overview={overview} blockedFeature={upgradeFeature} />;
}

function isPlanFeature(value: string): value is PlanFeature {
  const keys = [
    "markupMatrices",
    "customerSms",
    "integrations",
    "partsTech",
  ] as const;
  return (keys as readonly string[]).includes(value);
}
