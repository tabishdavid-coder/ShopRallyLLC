import { MarketingDashboard } from "@/components/marketing/marketing-dashboard";
import { getShopId } from "@/lib/shop";
import { getMarketingDashboardStats } from "@/server/marketing";

export default async function MarketingPage() {
  const stats = await getMarketingDashboardStats(await getShopId());
  return <MarketingDashboard stats={stats} />;
}
