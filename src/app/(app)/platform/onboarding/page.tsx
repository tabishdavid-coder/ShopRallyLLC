import { PlatformOnboarding } from "@/components/platform/platform-onboarding";
import { getOnboardingSummary } from "@/server/platform/onboarding";

export const metadata = { title: "Platform onboarding — ShopRally" };

type SearchParams = Promise<{ created?: string; shopId?: string }>;

export default async function PlatformOnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const summary = await getOnboardingSummary();
  const createdFromQuery = params.created?.trim();
  const shopFromId = params.shopId
    ? summary.shops.find((s) => s.id === params.shopId)?.name
    : undefined;

  return (
    <PlatformOnboarding
      shops={summary.shops}
      inPipelineCount={summary.inPipelineCount}
      readyToLaunchCount={summary.readyToLaunchCount}
      createdShopName={createdFromQuery || shopFromId}
      focusShopId={params.shopId?.trim() || undefined}
    />
  );
}
