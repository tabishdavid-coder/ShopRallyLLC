import { redirect } from "next/navigation";

import { enterShopCrmPath, MASTER_CRM_HOME } from "@/lib/platform-routing";
import { isPlatformAdmin } from "@/lib/platform";
import { canAccessShop } from "@/lib/shop";
import { switchShop } from "@/server/actions/platform";

type SearchParams = Promise<{ shop?: string; next?: string }>;

/** Deep link from Master CRM — sets tenant cookie then opens Shop CRM (merge-safe, no DEV shell edits). */
export default async function PlatformEnterShopPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!(await isPlatformAdmin())) {
    redirect(enterShopCrmPath());
  }

  const { shop: shopId, next } = await searchParams;
  if (!shopId) {
    redirect(MASTER_CRM_HOME);
  }

  const allowed = await canAccessShop(shopId);
  if (!allowed) {
    redirect(`${MASTER_CRM_HOME}/shops?error=access`);
  }

  const res = await switchShop(shopId);
  if (!res.ok) {
    redirect(`${MASTER_CRM_HOME}/shops?error=switch`);
  }

  redirect(enterShopCrmPath(shopId, next));
}
