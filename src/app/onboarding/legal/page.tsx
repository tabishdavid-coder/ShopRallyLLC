import { redirect } from "next/navigation";

import { LegalOnboardingForm } from "@/components/legal/legal-onboarding-form";
import { prisma } from "@/db/client";
import { getShopLegalCompliance } from "@/lib/legal-compliance";
import { getCurrentUser } from "@/lib/platform";
import { getShopId } from "@/lib/shop";

export const metadata = { title: "Legal onboarding — ShopRally" };

export default async function LegalOnboardingPage() {
  const [shopId, user] = await Promise.all([getShopId(), getCurrentUser()]);
  const compliance = await getShopLegalCompliance(shopId);
  if (compliance.compliant) {
    redirect("/dashboard");
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      name: true,
      legalEntityName: true,
      legalEntityState: true,
      state: true,
    },
  });

  const signerName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-red">
          Shop onboarding
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
          Platform agreements
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete this one-time step to activate your shop on ShopRally.
        </p>
      </div>

      <LegalOnboardingForm
        defaultLegalEntityName={shop?.legalEntityName ?? shop?.name ?? ""}
        defaultLegalEntityState={shop?.legalEntityState ?? shop?.state ?? ""}
        defaultSignerName={signerName}
        defaultSignerEmail={user.email}
      />
    </div>
  );
}
