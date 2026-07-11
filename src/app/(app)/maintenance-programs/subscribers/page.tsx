import Link from "next/link";

import { SubscribersListClient } from "@/components/maintenance/subscribers-list";
import { Button } from "@/components/ui/button";
import { getShopId } from "@/lib/shop";
import { canUseReleasedFeature } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import { getShopPlansShareContext } from "@/server/actions/maintenance-subscriptions";
import { listMaintenancePlans, type MaintenancePlanRow } from "@/server/maintenance-programs";
import { listSubscribers } from "@/server/maintenance-subscriptions";

export const metadata = { title: "Subscribers — Maintenance Programs" };
export const dynamic = "force-dynamic";

export default async function MaintenanceSubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; customerId?: string }>;
}) {
  const shopId = await getShopId();
  const params = await searchParams;
  const canAccess = await canUseReleasedFeature(shopId, "maintenance_programs");
  const [rows, shareCtx, allPlans] = await Promise.all([
    canAccess
      ? listSubscribers(shopId, { search: params.q, customerId: params.customerId })
      : Promise.resolve([]),
    canAccess ? getShopPlansShareContext() : Promise.resolve(null),
    canAccess ? listMaintenancePlans(shopId) : Promise.resolve([]),
  ]);

  const activePlans = (allPlans as MaintenancePlanRow[])
    .filter((p) => p.active)
    .map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      useClassPricing: p.useClassPricing,
      retailCents: p.retailCents,
      payInFullCents: p.payInFullCents,
      monthlyCents: p.monthlyCents,
      annualCents: p.annualCents,
      monthlyTermMonths: p.monthlyTermMonths,
      classPrices: p.classPrices,
    }));

  const plansUrl = shareCtx?.plansUrl ?? "";
  const shopName = shareCtx?.shopName ?? "Your shop";

  return (
    <div className="space-y-6 workspace-surface">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Subscribers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enroll customers at the counter or share your public signup link.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild size="sm" className="border-brand-navy text-brand-navy">
            <Link href="/maintenance-programs/visit">Service visit</Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link href="/marketing/maintenance-programs">Manage plans</Link>
          </Button>
        </div>
      </div>

      {!canAccess ? (
        <div className="rounded-lg border border-brand-light/40 bg-brand-light/10 p-4 text-sm text-on-brand-wash">
          Maintenance programs require {PLANS.ENTERPRISE.name}.{" "}
          <Link href="/settings/subscription" className="font-medium text-brand-navy underline">
            Upgrade
          </Link>
        </div>
      ) : (
        <SubscribersListClient
          rows={rows}
          search={params.q}
          plansUrl={plansUrl}
          shopName={shopName}
          activePlans={activePlans}
        />
      )}
    </div>
  );
}
