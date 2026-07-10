import "server-only";

import { prisma } from "@/db/client";
import { ROStatus } from "@/generated/prisma";
import {
  resolveCompletedRoArchiveSettings,
  type CompletedRoArchiveSettings,
} from "@/lib/job-board-archive";

export type AutoArchiveResult = {
  archivedCount: number;
  settings: CompletedRoArchiveSettings;
};

/**
 * Archive completed/invoiced ROs that are fully paid and older than the shop's
 * configured threshold. Called before job board loads so the Completed column
 * stays manageable.
 */
export async function runCompletedRoAutoArchive(shopId: string): Promise<AutoArchiveResult> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      completedRoAutoArchiveEnabled: true,
      completedRoAutoArchiveDays: true,
    },
  });

  const settings = shop
    ? resolveCompletedRoArchiveSettings(shop)
    : { enabled: false, days: 30 as const };

  if (!shop || !settings.enabled) {
    return { archivedCount: 0, settings };
  }

  const cutoff = new Date(Date.now() - settings.days * 24 * 60 * 60 * 1000);

  const result = await prisma.repairOrder.updateMany({
    where: {
      shopId,
      archivedAt: null,
      status: { in: [ROStatus.COMPLETED, ROStatus.INVOICED] },
      AND: [
        {
          OR: [{ completedAt: { lt: cutoff } }, { completedAt: null, updatedAt: { lt: cutoff } }],
        },
        {
          OR: [{ invoice: null }, { invoice: { balanceCents: 0 } }],
        },
      ],
    },
    // Clear custom-section membership so archived ROs don't block section delete.
    data: { archivedAt: new Date(), jobBoardColumnId: null },
  });

  return { archivedCount: result.count, settings };
}
