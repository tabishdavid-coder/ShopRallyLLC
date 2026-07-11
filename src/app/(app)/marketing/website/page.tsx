import { GROWTH_PRODUCTS, growthEnginePageTitle } from "@/lib/growth-engine-brand";
import { WebsiteSeoServicePage } from "@/components/website-seo/website-seo-service";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { getWebsiteAdmin } from "@/server/website-seo";

export const metadata = {
  title: growthEnginePageTitle(GROWTH_PRODUCTS.shopSite.label),
};

export default async function MarketingWebsitePage() {
  const shopId = await getShopId();
  const [hasShopSite, hasSeo, aiSeoAutopilot] = await Promise.all([
    canUseReleasedFeature(shopId, "shop_site"),
    canUseReleasedFeature(shopId, "website_seo"),
    canUseReleasedFeature(shopId, "ai_seo_content"),
  ]);
  const admin = await getWebsiteAdmin(shopId, hasShopSite || hasSeo);

  return <WebsiteSeoServicePage admin={admin} aiSeoAutopilot={aiSeoAutopilot} />;
}
