/**
 * Idempotent seed for shop labor catalog on shop_demo + shop_macuto.
 */
import { prisma } from "../src/db/client";
import { SHOP_LABOR_ITEM_SEED } from "../src/lib/shop-labor-items-seed-data";

const SHOP_IDS = ["shop_demo", "shop_macuto"] as const;

async function seedShopLabor(shopId: string) {
  const existing = await prisma.shopLaborItem.count({ where: { shopId } });
  if (existing >= SHOP_LABOR_ITEM_SEED.length) {
    console.log(`${shopId} already has ${existing} shop labor item(s) — skipping.`);
    return existing;
  }

  if (existing > 0) {
    await prisma.shopLaborItem.deleteMany({ where: { shopId } });
  }

  await prisma.shopLaborItem.createMany({
    data: SHOP_LABOR_ITEM_SEED.map((item, i) => ({
      shopId,
      name: item.name,
      description: item.description ?? null,
      rateCents: item.rateCents,
      defaultHours: item.defaultHours,
      costCents: item.costCents ?? 0,
      taxable: item.taxable ?? true,
      isActive: item.isActive ?? true,
      sortOrder: i,
    })),
  });

  console.log(`${shopId}: seeded ${SHOP_LABOR_ITEM_SEED.length} shop labor items.`);
  return SHOP_LABOR_ITEM_SEED.length;
}

async function main() {
  for (const shopId of SHOP_IDS) {
    await seedShopLabor(shopId);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
