import { notFound } from "next/navigation";

import { CampaignDetailClient } from "@/components/marketing/campaigns/campaign-detail-client";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { getCampaign, getCampaignContext } from "@/server/campaigns";

export const metadata = { title: "Campaign — Marketing" };
export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const shopId = await getShopId();
  const { id } = await params;
  const sp = await searchParams;

  const [campaign, ctx, allowed, aiCampaignDrafting] = await Promise.all([
    getCampaign(shopId, id),
    getCampaignContext(shopId),
    canUseReleasedFeature(shopId, "marketing_campaigns"),
    canUseReleasedFeature(shopId, "ai_campaign_drafting"),
  ]);

  if (!campaign) notFound();

  return (
    <CampaignDetailClient
      campaign={campaign}
      googleReviewsConnected={ctx.googleReviewsConnected}
      aiCampaignDrafting={aiCampaignDrafting}
      launchError={allowed ? sp.error : "Upgrade to Professional to manage campaigns."}
    />
  );
}
