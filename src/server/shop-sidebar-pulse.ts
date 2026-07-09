import "server-only";

import { prisma } from "@/db/client";
import { MessageDirection, ROStatus } from "@/generated/prisma";

export type ShopSidebarPulse = {
  openEstimates: number;
  workInProgress: number;
  unreadMessages: number;
};

/** Lightweight counts for sidebar pulse badges. */
export async function getShopSidebarPulse(shopId: string): Promise<ShopSidebarPulse> {
  const [openEstimates, workInProgress, unreadMessages] = await Promise.all([
    prisma.repairOrder.count({
      where: { shopId, status: ROStatus.ESTIMATE },
    }),
    prisma.repairOrder.count({
      where: { shopId, status: { in: [ROStatus.APPROVED, ROStatus.IN_PROGRESS] } },
    }),
    prisma.message.count({
      where: { shopId, direction: MessageDirection.INBOUND, readAt: null },
    }),
  ]);

  return { openEstimates, workInProgress, unreadMessages };
}
