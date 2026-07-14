import { PlanUpgradePanel } from "@/components/billing/plan-upgrade-panel";
import { GROWTH_ENGINE } from "@/lib/growth-engine-brand";

export const metadata = { title: "Upgrade — ShopRally" };
export const dynamic = "force-dynamic";

/**
 * Soft-land target for plan/release-gated deep links.
 * Layout redirects here instead of silent /dashboard?access=denied.
 */
export default async function PlanRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{
    feature?: string;
    description?: string;
    pending?: string;
  }>;
}) {
  const params = await searchParams;
  const featureLabel = params.feature?.trim() || GROWTH_ENGINE.name;
  const description = params.description?.trim() || undefined;
  const notAvailableYet = params.pending === "1";

  return (
    <div className="flex flex-1 items-start justify-center py-10">
      <PlanUpgradePanel
        featureLabel={featureLabel}
        description={description}
        notAvailableYet={notAvailableYet}
      />
    </div>
  );
}
