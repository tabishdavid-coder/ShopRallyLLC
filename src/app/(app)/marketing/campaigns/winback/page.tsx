import Link from "next/link";

import { WinbackCampaignPage } from "@/components/marketing/campaigns/winback-campaign-page";
import { GROWTH_ENGINE, growthEnginePageTitle } from "@/lib/growth-engine-brand";
import { audienceForWinbackPreset, WINBACK_PRESETS } from "@/lib/campaigns";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { getCampaignContext, previewAudienceCount } from "@/server/campaigns";

export const metadata = { title: growthEnginePageTitle("Win Back Customers") };
export const dynamic = "force-dynamic";

export default async function WinbackCampaignRoute() {
  const shopId = await getShopId();
  const canCreate = await canUseReleasedFeature(shopId, "marketing_campaigns");

  if (!canCreate) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm">
        {GROWTH_ENGINE.upgradeHint}{" "}
        <Link href="/settings/subscription" className="font-medium text-brand-navy underline">
          Upgrade
        </Link>
      </div>
    );
  }

  const [ctx, segmentStats] = await Promise.all([
    getCampaignContext(shopId),
    Promise.all(
      WINBACK_PRESETS.map(async (preset) => ({
        preset: preset.id,
        days: preset.days,
        count: await previewAudienceCount(shopId, audienceForWinbackPreset(preset.id)),
      })),
    ),
  ]);

  return (
    <WinbackCampaignPage
      previewContext={{
        shopName: ctx.shopName,
        shopPhone: ctx.shopPhone,
        bookingLink: ctx.bookingLink,
      }}
      initialSegmentStats={segmentStats}
    />
  );
}
