import "server-only";

import { prisma } from "@/db/client";
import { MARKETING_LAUNCH } from "@/lib/marketing-launch";

const WAITLIST_SUBJECT_PREFIX = "Founding waitlist";

export type FoundingWaitlistStats = {
  /** Internal waitlist signup count only — never show as “spots left” publicly. */
  claimed: number;
  /** Static founding-program size (soft copy). Not a live scarcity meter. */
  total: number;
};

/**
 * Internal founding waitlist count from marketing-site support tickets.
 * Do not render remaining/countdown/urgency meters from this on the public site.
 */
export async function getFoundingWaitlistStats(): Promise<FoundingWaitlistStats> {
  const claimed = await prisma.supportTicket.count({
    where: {
      shopId: null,
      subject: { startsWith: WAITLIST_SUBJECT_PREFIX },
    },
  });

  return { claimed, total: MARKETING_LAUNCH.foundingSpotsTotal };
}
