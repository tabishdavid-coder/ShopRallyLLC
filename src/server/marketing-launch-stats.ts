import "server-only";

import { prisma } from "@/db/client";
import { MARKETING_LAUNCH } from "@/lib/marketing-launch";

const WAITLIST_SUBJECT_PREFIX = "Founding waitlist";

export type FoundingWaitlistStats = {
  claimed: number;
  total: number;
  remaining: number;
};

/** Live founding waitlist count from marketing-site support tickets. */
export async function getFoundingWaitlistStats(): Promise<FoundingWaitlistStats> {
  const claimed = await prisma.supportTicket.count({
    where: {
      shopId: null,
      subject: { startsWith: WAITLIST_SUBJECT_PREFIX },
    },
  });

  const total = MARKETING_LAUNCH.foundingSpotsTotal;
  const remaining = Math.max(0, total - claimed);

  return { claimed, total, remaining };
}
