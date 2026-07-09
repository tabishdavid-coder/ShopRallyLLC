import { notFound } from "next/navigation";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { getCustomerTagNames } from "@/server/actions/customer-settings";
import { CustomerSettings } from "@/components/settings/customer-settings";

export default async function CustomersSettingsPage() {
  const shopId = await getShopId();
  const [shop, tags] = await Promise.all([
    prisma.shop.findUnique({ where: { id: shopId }, select: { defaultMarketingOptIn: true } }),
    getCustomerTagNames(),
  ]);
  if (!shop) notFound();

  return <CustomerSettings initialTags={tags} initialDefaultOptIn={shop.defaultMarketingOptIn} />;
}
