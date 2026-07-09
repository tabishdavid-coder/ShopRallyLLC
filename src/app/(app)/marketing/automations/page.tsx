import { AutomationsPageClient } from "@/components/marketing/automations/automations-page-client";
import { GROWTH_ENGINE, GROWTH_PRODUCTS, growthEnginePageTitle } from "@/lib/growth-engine-brand";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { listAutomations, listAutomationSendHistory, listScheduledMessages } from "@/server/automations";

export const metadata = {
  title: growthEnginePageTitle(GROWTH_PRODUCTS.automations.label),
};
export const dynamic = "force-dynamic";

export default async function MarketingAutomationsPage() {
  const shopId = await getShopId();
  const [canManage, automations, scheduledMessages, sendHistory] = await Promise.all([
    canUseFeature(shopId, "marketing_campaigns"),
    listAutomations(shopId),
    listScheduledMessages(shopId),
    listAutomationSendHistory(shopId),
  ]);

  return (
    <AutomationsPageClient
      automations={automations}
      scheduledMessages={scheduledMessages}
      sendHistory={sendHistory}
      canManage={canManage}
    />
  );
}
