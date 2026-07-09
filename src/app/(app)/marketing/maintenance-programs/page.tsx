import Link from "next/link";
import { notFound } from "next/navigation";

import { MaintenanceProgramsHub } from "@/components/marketing/maintenance-programs-hub";
import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { canUseFeature } from "@/lib/subscription";
import { getMarketingMaintenanceProgramsAdmin } from "@/server/actions/maintenance-programs";
import { listCannedJobCategories, listCannedJobsForPicker } from "@/server/canned-jobs";
import { listAllProgramServices } from "@/server/maintenance-program-services";

import { GROWTH_PRODUCTS, growthEnginePageTitle } from "@/lib/growth-engine-brand";

export const metadata = {
  title: growthEnginePageTitle(GROWTH_PRODUCTS.bayCare.label),
};
export const dynamic = "force-dynamic";

export default async function MaintenanceProgramsPage() {
  const shopId = await getShopId();
  const [canEdit, data, services, cannedJobs, cannedJobCategories, shopRow] = await Promise.all([
    canUseFeature(shopId, "maintenance_programs"),
    getMarketingMaintenanceProgramsAdmin(),
    listAllProgramServices(shopId),
    listCannedJobsForPicker(shopId),
    listCannedJobCategories(shopId),
    prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        laborRateCents: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
      },
    }),
  ]);
  if (!data) notFound();

  return (
    <div className="space-y-6 workspace-surface">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Maintenance Programs</h2>
          <p className="text-sm text-muted-foreground">
            Build your service library, create subscriptions, then set customer pricing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={data.plansUrl}
            target="_blank"
            className="text-sm font-medium text-brand-navy hover:underline"
          >
            View public page →
          </Link>
          {canEdit ? (
            <Link
              href="/maintenance-programs/subscribers"
              className="text-sm font-medium text-brand-navy hover:underline"
            >
              View subscribers →
            </Link>
          ) : null}
        </div>
      </div>
      <MaintenanceProgramsHub
        canEdit={canEdit}
        settings={data.settings}
        plans={data.plans}
        services={services}
        cannedJobs={cannedJobs}
        cannedJobCategories={cannedJobCategories}
        laborRateCents={shopRow?.laborRateCents ?? 12500}
        slug={data.slug}
        shopCode={data.shop.code}
        plansUrl={data.plansUrl}
        shopName={data.shop.name}
        activePlans={data.plans
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
          }))}
        embedIframe={data.embedIframe}
        embedLink={data.embedLink}
        shop={{
          phone: shopRow?.phone ?? null,
          address: shopRow?.address ?? null,
          city: shopRow?.city ?? null,
          state: shopRow?.state ?? null,
          zip: shopRow?.zip ?? null,
        }}
      />
    </div>
  );
}
