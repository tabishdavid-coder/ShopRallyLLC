import { getShopId } from "@/lib/shop";
import { getShopLegalCompliance } from "@/lib/legal-compliance";
import { LegalSettingsPanel } from "@/components/legal/legal-settings-panel";
import { prisma } from "@/db/client";
import { getShopCustomAgreement } from "@/server/custom-msa";
import { listShopLegalAcceptances } from "@/server/legal";

export const metadata = { title: "Legal — Shop Settings" };

export default async function SettingsLegalPage() {
  const shopId = await getShopId();
  const [shop, acceptances, compliance, customMsa] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { legalEntityName: true, legalEntityState: true },
    }),
    listShopLegalAcceptances(shopId),
    getShopLegalCompliance(shopId),
    getShopCustomAgreement(shopId),
  ]);

  return (
    <LegalSettingsPanel
      legalEntityName={shop?.legalEntityName ?? null}
      legalEntityState={shop?.legalEntityState ?? null}
      acceptances={acceptances}
      pendingReaccept={compliance.pendingReaccept}
      outdatedTypes={compliance.outdatedTypes}
      customMsa={customMsa}
    />
  );
}
