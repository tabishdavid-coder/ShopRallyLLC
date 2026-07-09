/**
 * Idempotent seed for demo canned jobs on shop_demo.
 * Safe to run when tables exist but canned job rows are missing (post db push).
 */
import { prisma } from "../src/db/client";

const dollars = (n: number) => Math.round(n * 100);

async function main() {
  const shopId = "shop_demo";
  const existing = await prisma.cannedJob.count({ where: { shopId } });
  if (existing > 0) {
    console.log(`shop_demo already has ${existing} canned job(s) — skipping.`);
    return;
  }

  const owner = await prisma.user.findFirst({
    where: { email: "david@inandout.test" },
    select: { id: true },
  });

  await prisma.cannedJob.createMany({
    data: [
      {
        shopId,
        name: "Synthetic oil & filter change",
        category: "Maintenance",
        description: "Full synthetic oil change with filter replacement",
        sortOrder: 0,
        usageCount: 12,
        lastUsedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        createdById: owner?.id ?? null,
      },
      {
        shopId,
        name: "Front brake pads & rotors",
        category: "Brakes",
        description: "Replace front brake pads and rotors",
        sortOrder: 1,
        usageCount: 5,
        lastUsedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
        createdById: owner?.id ?? null,
      },
      {
        shopId,
        name: "NYS inspection",
        category: "Inspection",
        sortOrder: 2,
        usageCount: 8,
        createdById: owner?.id ?? null,
      },
      {
        shopId,
        name: "Coolant flush",
        category: "Fluids",
        sortOrder: 3,
        usageCount: 2,
        createdById: owner?.id ?? null,
      },
    ],
  });

  const canned = await prisma.cannedJob.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.cannedJobLaborLine.createMany({
    data: [
      { shopId, cannedJobId: canned[0].id, description: "Full synthetic oil & filter change", hours: 0.5, sortOrder: 0 },
      { shopId, cannedJobId: canned[1].id, description: "Replace front brake pads and rotors", hours: 2.0, sortOrder: 0 },
      { shopId, cannedJobId: canned[2].id, description: "NYS safety & emissions inspection", hours: 0.5, sortOrder: 0 },
      { shopId, cannedJobId: canned[3].id, description: "Drain, flush cooling system, refill coolant", hours: 1.2, sortOrder: 0 },
    ],
  });

  await prisma.cannedJobPartLine.createMany({
    data: [
      { shopId, cannedJobId: canned[0].id, description: "Oil filter", brand: "Motorcraft", partNumber: "OF-1240", costCents: dollars(7), quantity: 1, sortOrder: 0 },
      { shopId, cannedJobId: canned[0].id, description: "5W-30 full synthetic (6 qt)", brand: "Mobil 1", partNumber: "OIL-530", costCents: dollars(28), quantity: 1, sortOrder: 1 },
      { shopId, cannedJobId: canned[1].id, description: "Front brake pad set", brand: "Akebono", partNumber: "BP-4821", costCents: dollars(48), quantity: 1, sortOrder: 0 },
      { shopId, cannedJobId: canned[1].id, description: "Front rotor", brand: "Bosch", partNumber: "RT-9920", costCents: dollars(95), quantity: 2, sortOrder: 1 },
      { shopId, cannedJobId: canned[3].id, description: "Coolant concentrate (1 gal)", brand: "Prestone", partNumber: "AF-550", costCents: dollars(18), quantity: 1, sortOrder: 0 },
    ],
  });

  console.log(`Seeded ${canned.length} canned jobs for ${shopId}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
