import { notFound } from "next/navigation";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { CommissionsSettings } from "@/components/settings/commissions-settings";
import { resolveCommissions } from "@/lib/commissions";

export default async function CommissionsSettingsPage() {
  const shop = await prisma.shop.findUnique({
    where: { id: await getShopId() },
    select: { commissions: true },
  });
  if (!shop) notFound();

  return <CommissionsSettings initial={resolveCommissions(shop.commissions)} />;
}
