import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { prisma } from "@/db/client";
import { isPlatformAdmin } from "@/lib/platform";
import { platformEnterPath } from "@/lib/platform-routing";
import { getShopId } from "@/lib/shop";
import { getRepairOrder } from "@/server/repair-order";

type RepairOrderDetail = NonNullable<Awaited<ReturnType<typeof getRepairOrder>>>;

/**
 * Load an RO for the active shop. Platform admins opening an RO that belongs to
 * another tenant are redirected through `/platform/enter` to set the shop cookie.
 */
export async function requireRepairOrder(roId: string): Promise<{
  shopId: string;
  ro: RepairOrderDetail;
}> {
  const shopId = await getShopId();
  const ro = await getRepairOrder({ shopId, id: roId });
  if (ro) return { shopId, ro };

  if (await isPlatformAdmin()) {
    const foreign = await prisma.repairOrder.findFirst({
      where: { id: roId },
      select: { shopId: true },
    });
    if (foreign) {
      const pathname =
        (await headers()).get("x-pathname") ?? `/repair-orders/${roId}/estimate`;
      redirect(platformEnterPath(foreign.shopId, pathname));
    }
  }

  notFound();
}
