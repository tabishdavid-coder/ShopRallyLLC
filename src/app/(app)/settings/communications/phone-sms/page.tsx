import { PlanUpgradePanel } from "@/components/billing/plan-upgrade-panel";
import { MessagingSettingsPanel } from "@/components/settings/messaging-settings";
import { PLANS } from "@/lib/plans";
import { getShopId } from "@/lib/shop";
import { canUseFeature, canUseReleasedFeature } from "@/lib/subscription";
import { getMessagingSettings } from "@/server/actions/messaging-settings";

export const metadata = { title: "Phone & SMS — Communications — Shop Settings" };
export const dynamic = "force-dynamic";

export default async function CommunicationsPhoneSmsPage() {
  const shopId = await getShopId();
  const [onPlan, released] = await Promise.all([
    canUseFeature(shopId, "sms"),
    canUseReleasedFeature(shopId, "sms"),
  ]);

  if (!released) {
    return (
      <PlanUpgradePanel
        featureLabel="Two-way SMS"
        description={
          onPlan
            ? undefined
            : `Two-way customer SMS is included on ${PLANS.STARTER.name} (Ignition), ${PLANS.PROFESSIONAL.name}, and ${PLANS.ENTERPRISE.name}. Email sharing stays available when SMS is off.`
        }
        notAvailableYet={onPlan}
        secondaryHref="/settings/communications/email"
        secondaryLabel="Open Email settings"
      />
    );
  }

  const settings = await getMessagingSettings();
  return <MessagingSettingsPanel initial={settings} />;
}
