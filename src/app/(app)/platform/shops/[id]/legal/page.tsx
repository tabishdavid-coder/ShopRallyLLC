import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomMsaAdminForm } from "@/components/platform/custom-msa-admin-form";
import { prisma } from "@/db/client";
import { getShopCustomAgreement } from "@/server/custom-msa";

export const metadata = { title: "Shop legal — Platform" };

export default async function PlatformShopLegalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shop = await prisma.shop.findUnique({
    where: { id },
    select: { id: true, name: true, code: true, plan: true, legalEntityName: true },
  });
  if (!shop) notFound();

  const customMsa = await getShopCustomAgreement(id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/platform/shops" className="text-brand-navy hover:underline">
            Platform shops
          </Link>
          {" / "}
          <Link href={`/platform/shops/${shop.id}`} className="text-brand-navy hover:underline">
            {shop.name}
          </Link>
          {" / Legal"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{shop.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {shop.code} · {shop.plan}
          {shop.legalEntityName ? ` · ${shop.legalEntityName}` : ""}
        </p>
      </div>

      <CustomMsaAdminForm shopId={shop.id} shopName={shop.name} existing={customMsa} />
    </div>
  );
}
