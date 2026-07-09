import { prisma } from "@/db/client";
import { ROStatus } from "@/generated/prisma";

/** Repair orders available in the estimate-building design lab. */
export async function listEstimateLabRos(shopId: string) {
  return prisma.repairOrder.findMany({
    where: {
      shopId,
      status: { in: [ROStatus.ESTIMATE, ROStatus.APPROVED, ROStatus.IN_PROGRESS] },
    },
    orderBy: { number: "desc" },
    take: 40,
    select: {
      id: true,
      number: true,
      status: true,
      customer: {
        select: { firstName: true, lastName: true, company: true },
      },
      vehicle: {
        select: { year: true, make: true, model: true },
      },
      _count: { select: { jobs: true } },
    },
  });
}
