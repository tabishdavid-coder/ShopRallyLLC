import "server-only";

import { prisma } from "@/db/client";

export type Technician = { id: string; name: string };

type TechnicianQueryOpts = {
  /** When true, only active members flagged canPerformWork (Tech Board columns). */
  boardEligible?: boolean;
};

/** Shop members who can be assigned to jobs. */
export async function getShopTechnicians(
  shopId: string,
  opts?: TechnicianQueryOpts,
): Promise<Technician[]> {
  const members = await prisma.membership.findMany({
    where: {
      shopId,
      active: true,
      ...(opts?.boardEligible ? { canPerformWork: true } : {}),
    },
    select: { user: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { role: "asc" },
  });
  return members.map((m) => ({
    id: m.user.id,
    name: `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() || "Unnamed",
  }));
}
