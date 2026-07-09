import Link from "next/link";
import { Suspense } from "react";

import { CampaignWizardFromUrl } from "@/components/marketing/campaigns/campaign-wizard";
import { GROWTH_ENGINE, growthEnginePageTitle } from "@/lib/growth-engine-brand";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";

export const metadata = { title: growthEnginePageTitle("New Outreach") };

export default async function NewCampaignPage() {
  const shopId = await getShopId();
  const [canCreate, aiCampaignDrafting] = await Promise.all([
    canUseFeature(shopId, "marketing_campaigns"),
    canUseFeature(shopId, "ai_campaign_drafting"),
  ]);

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

  return (
    <div className="space-y-4">
      <nav className="text-sm text-muted-foreground">
        <Link href="/marketing/campaigns" className="hover:text-primary">
          ← Back to campaigns
        </Link>
      </nav>
      <h2 className="text-lg font-semibold">Create campaign</h2>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <CampaignWizardFromUrl aiCampaignDrafting={aiCampaignDrafting} />
      </Suspense>
    </div>
  );
}
