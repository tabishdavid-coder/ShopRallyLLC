import "server-only";

import { prisma } from "@/db/client";

export type Technician = { id: string; name: string };

type TechnicianQueryOpts = {
  /** @deprecated canPerformWork is now always required — kept for call-site compatibility. */
  boardEligible?: boolean;
};

/**
 * Shop members who can be assigned wrench work (technician pickers, tech board).
 * Only active members flagged `canPerformWork` — service advisors / owners who
 * don't wrench are managed separately via `getRoSidebarOptions().serviceWriters`.
 */
export async function getShopTechnicians(
  shopId: string,
  _opts?: TechnicianQueryOpts,
): Promise<Technician[]> {
  const members = await prisma.membership.findMany({
    where: {
      shopId,
      active: true,
      canPerformWork: true,
    },
    select: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { role: "asc" },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() || "Unnamed",
  }));
}
