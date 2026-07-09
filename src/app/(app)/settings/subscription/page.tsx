import { redirect } from "next/navigation";

import { BillingModule } from "@/components/billing/billing-module";
import { getShopId } from "@/lib/shop";
import { getBillingOverview } from "@/server/billing";

export const metadata = { title: "Subscription — Shop Settings" };
export const dynamic = "force-dynamic";

export default async function SubscriptionSettingsPage() {
  const shopId = await getShopId();
  const overview = await getBillingOverview(shopId);

  return <BillingModule overview={overview} />;
}
