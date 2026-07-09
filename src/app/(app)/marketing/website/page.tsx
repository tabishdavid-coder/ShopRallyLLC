import { GROWTH_PRODUCTS, growthEnginePageTitle } from "@/lib/growth-engine-brand";
import { WebsiteSeoServicePage } from "@/components/website-seo/website-seo-service";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { getWebsiteAdmin } from "@/server/website-seo";

export const metadata = {
  title: growthEnginePageTitle(GROWTH_PRODUCTS.shopSite.label),
};

export default async function MarketingWebsitePage() {
  const shopId = await getShopId();
  const [hasShopSite, hasSeo, aiSeoAutopilot] = await Promise.all([
    canUseFeature(shopId, "shop_site"),
    canUseFeature(shopId, "website_seo"),
    canUseFeature(shopId, "ai_seo_content"),
  ]);
  const admin = await getWebsiteAdmin(shopId, hasShopSite || hasSeo);

  return <WebsiteSeoServicePage admin={admin} aiSeoAutopilot={aiSeoAutopilot} />;
}
