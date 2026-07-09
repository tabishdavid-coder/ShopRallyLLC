import { notFound } from "next/navigation";

import { PlatformShopCrmAccessLog } from "@/components/platform/platform-shop-crm-access-log";
import { PlatformShopDetailView } from "@/components/platform/platform-shop-detail";
import { getPlatformShopDetail } from "@/server/platform/shop-detail";
import { getShopOnboardingCompliance } from "@/server/platform/onboarding";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shop = await getPlatformShopDetail(id);
  return { title: shop ? `${shop.name} — Platform` : "Shop — Platform" };
}

export default async function PlatformShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [shop, compliance] = await Promise.all([
    getPlatformShopDetail(id),
    getShopOnboardingCompliance(id),
  ]);
  if (!shop) notFound();

  return (
    <div className="space-y-6">
      <PlatformShopDetailView
        shop={shop}
        compliance={
          compliance
            ? {
                complianceSteps: compliance.complianceSteps,
                auditEvents: compliance.auditEvents,
                provisionMethod: compliance.shop.provisionMethod,
                legalEntityName: compliance.shop.legalEntityName,
              }
            : undefined
        }
      />
      <PlatformShopCrmAccessLog shopId={id} />
    </div>
  );
}
