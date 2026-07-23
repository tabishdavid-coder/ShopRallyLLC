/**
 * Idempotent seed for demo canned jobs on shop_demo + shop_macuto.
 * Safe to run when tables exist but canned job rows are missing or incomplete.
 */
import { prisma } from "../src/db/client";
import { CANNED_JOB_SEED_TEMPLATES } from "../src/lib/canned-jobs-seed-data";

const SHOP_IDS = ["shop_demo", "shop_macuto"] as const;

async function seedShopCannedJobs(shopId: string, createdById: string | null) {
  const existing = await prisma.cannedJob.count({ where: { shopId } });
  if (existing >= CANNED_JOB_SEED_TEMPLATES.length) {
    console.log(`${shopId} already has ${existing} canned job(s) — skipping.`);
    return existing;
  }

  if (existing > 0) {
    console.log(`${shopId} has ${existing} canned job(s) — clearing for full reseed.`);
    await prisma.cannedJobLaborLine.deleteMany({ where: { shopId } });
    await prisma.cannedJobPartLine.deleteMany({ where: { shopId } });
    await prisma.cannedJob.deleteMany({ where: { shopId } });
  }

  const now = Date.now();

  await prisma.cannedJob.createMany({
    data: CANNED_JOB_SEED_TEMPLATES.map((t, i) => ({
      shopId,
      name: t.name,
      category: t.category,
      description: t.description ?? null,
      sortOrder: i,
      usageCount: t.usageCount ?? 0,
      lastUsedAt:
        t.lastUsedDaysAgo != null ? new Date(now - t.lastUsedDaysAgo * 24 * 3600 * 1000) : null,
      createdById,
    })),
  });

  const canned = await prisma.cannedJob.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
  });

  const laborRows: {
    shopId: string;
    cannedJobId: string;
    description: string;
    hours: number;
    flatAmountCents: number | null;
    sortOrder: number;
  }[] = [];

  const partRows: {
    shopId: string;
    cannedJobId: string;
    description: string;
    brand: string | null;
    partNumber: string | null;
    costCents: number;
    quantity: number;
    sortOrder: number;
  }[] = [];

  canned.forEach((job, i) => {
    const template = CANNED_JOB_SEED_TEMPLATES[i];
    if (!template) return;
    template.labor.forEach((l, li) => {
      laborRows.push({
        shopId,
        cannedJobId: job.id,
        description: l.description,
        hours: l.hours,
        flatAmountCents: l.flatAmountCents ?? null,
        sortOrder: li,
      });
    });
    template.parts.forEach((p, pi) => {
      partRows.push({
        shopId,
        cannedJobId: job.id,
        description: p.description,
        brand: p.brand || null,
        partNumber: p.partNumber || null,
        costCents: p.costCents,
        quantity: p.quantity,
        sortOrder: pi,
      });
    });
  });

  if (laborRows.length) await prisma.cannedJobLaborLine.createMany({ data: laborRows });
  if (partRows.length) await prisma.cannedJobPartLine.createMany({ data: partRows });

  console.log(`Seeded ${canned.length} canned jobs for ${shopId}.`);
  return canned.length;
}

async function main() {
  const owner = await prisma.user.findFirst({
    where: { email: "david@inandout.test" },
    select: { id: true },
  });

  let total = 0;
  for (const shopId of SHOP_IDS) {
    total += await seedShopCannedJobs(shopId, owner?.id ?? null);
  }
  console.log(`Done — ${total} canned jobs across ${SHOP_IDS.length} shops.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
