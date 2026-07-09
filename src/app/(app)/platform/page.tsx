import { PlatformContextCard } from "@/components/platform/platform-context-card";
import { PlatformHome } from "@/components/platform/platform-home";
import { PlatformOperatorShortcuts } from "@/components/platform/platform-operator-shortcuts";
import { getPlatformDashboard } from "@/server/platform/dashboard";
import { getCurrentShop } from "@/lib/shop";

export const metadata = { title: "Platform overview — ShopRally" };

export default async function PlatformOverviewPage() {
  const [data, activeShop] = await Promise.all([getPlatformDashboard(), getCurrentShop()]);
  return (
    <>
      <PlatformContextCard activeShop={activeShop} />
      <div className="mt-6 space-y-8">
        <PlatformOperatorShortcuts />
        <PlatformHome data={data} />
      </div>
    </>
  );
}
