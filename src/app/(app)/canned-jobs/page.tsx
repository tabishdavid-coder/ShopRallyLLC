import { getShopId } from "@/lib/shop";
import { listCannedJobs, listCannedJobCategories } from "@/server/canned-jobs";
import { CannedJobsManager } from "@/components/canned-jobs/canned-jobs-manager";
import { prisma } from "@/db/client";

export default async function CannedJobsPage() {
  const shopId = await getShopId();
  const [jobs, categories, shop] = await Promise.all([
    listCannedJobs(shopId),
    listCannedJobCategories(shopId),
    prisma.shop.findUnique({ where: { id: shopId }, select: { laborRateCents: true } }),
  ]);

  const laborRateCents = shop?.laborRateCents ?? 15000;

  return (
    <CannedJobsManager initialJobs={jobs} categories={categories} laborRateCents={laborRateCents} />
  );
}
