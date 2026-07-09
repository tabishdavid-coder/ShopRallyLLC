import "server-only";

import { prisma } from "@/db/client";
import { estimateCannedJobUnitCostCents } from "@/lib/maintenance-canned-jobs";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import { getCannedJob, listCannedJobsForPicker } from "@/server/canned-jobs";

export async function listProgramServices(shopId: string) {
  return prisma.maintenanceProgramService.findMany({
    where: { shopId, active: true },
    include: {
      cannedJob: { select: { id: true, name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listAllProgramServices(shopId: string) {
  return prisma.maintenanceProgramService.findMany({
    where: { shopId },
    include: {
      cannedJob: { select: { id: true, name: true } },
      _count: { select: { entitlements: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getProgramService(shopId: string, id: string) {
  return prisma.maintenanceProgramService.findFirst({
    where: { id, shopId },
    include: { cannedJob: { select: { id: true, name: true } } },
  });
}

export async function estimateShopCannedJobCost(shopId: string, job: CannedJobSummary) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { laborRateCents: true },
  });
  return estimateCannedJobUnitCostCents(job, shop?.laborRateCents ?? 12500);
}

export async function buildProgramServiceFromCannedJob(shopId: string, cannedJobId: string) {
  const job = await getCannedJob(shopId, cannedJobId);
  if (!job) return null;
  const unitCostCents = await estimateShopCannedJobCost(shopId, job);
  return { job, unitCostCents };
}

export { listCannedJobsForPicker };
