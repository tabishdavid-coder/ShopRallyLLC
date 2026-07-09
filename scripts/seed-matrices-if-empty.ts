import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const DEFAULT_PART_MATRIX = [
  { minCents: 0, maxCents: 499, multiplier: 4.0 },
  { minCents: 500, maxCents: 1000, multiplier: 3.5 },
  { minCents: 1001, maxCents: 2000, multiplier: 3.25 },
  { minCents: 2001, maxCents: 4000, multiplier: 3.0 },
  { minCents: 4001, maxCents: 6499, multiplier: 2.75 },
  { minCents: 6500, maxCents: 9999, multiplier: 2.5 },
  { minCents: 10000, maxCents: 14999, multiplier: 2.25 },
  { minCents: 15000, maxCents: 50000, multiplier: 2.0 },
  { minCents: 50001, maxCents: 300000, multiplier: 1.75 },
  { minCents: 300001, maxCents: null, multiplier: 1.43 },
];

const DEFAULT_LABOR_MATRIX = [
  { minHours: 0, maxHours: 1.0, multiplier: 1 },
  { minHours: 1.01, maxHours: 3.0, multiplier: 1.05 },
  { minHours: 3.01, maxHours: 4.0, multiplier: 1.1 },
  { minHours: 4.01, maxHours: 5.0, multiplier: 1.12 },
  { minHours: 5.01, maxHours: 7.0, multiplier: 1.15 },
  { minHours: 7.01, maxHours: 8.0, multiplier: 1.2 },
  { minHours: 8.01, maxHours: 9.0, multiplier: 1.1 },
  { minHours: 9.01, maxHours: 10.0, multiplier: 1.05 },
  { minHours: 10.01, maxHours: null, multiplier: 1.02 },
];

async function main() {
  const shopId = "shop_demo";
  const [pc, lc] = await Promise.all([
    prisma.partMatrixTier.count({ where: { shopId } }),
    prisma.laborMatrixTier.count({ where: { shopId } }),
  ]);

  if (pc === 0) {
    await prisma.partMatrixTier.createMany({
      data: DEFAULT_PART_MATRIX.map((t, i) => ({ shopId, ...t, sortOrder: i })),
    });
    console.log(`Seeded ${DEFAULT_PART_MATRIX.length} part matrix tiers`);
  } else {
    console.log(`Part matrix already has ${pc} tiers — skipped`);
  }

  if (lc === 0) {
    await prisma.laborMatrixTier.createMany({
      data: DEFAULT_LABOR_MATRIX.map((t, i) => ({ shopId, ...t, sortOrder: i })),
    });
    console.log(`Seeded ${DEFAULT_LABOR_MATRIX.length} labor matrix tiers`);
  } else {
    console.log(`Labor matrix already has ${lc} tiers — skipped`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
