/**
 * Seed realistic parts inventory for demo shops (Macuto + In & Out AutoHaus).
 * Idempotent — skips part numbers that already exist per shop.
 *
 * Run:
 *   npm run db:seed-inventory
 *   npx tsx scripts/seed-inventory-demo.ts
 *   npx tsx scripts/seed-inventory-demo.ts --shop=shop_macuto
 */
import { PrismaClient } from "../src/generated/prisma";
import { CORE_QA_SHOP_ID, DEMO_SHOP_ID } from "../src/lib/shop-constants";

const prisma = new PrismaClient();

const dollars = (n: number) => Math.round(n * 100);

type PartSeed = {
  partNumber: string;
  description: string;
  brand: string;
  category: string;
  vendorName: string;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQty: number;
  costCents: number;
  retailCents: number;
  binLocation: string;
};

const INVENTORY_PARTS: PartSeed[] = [
  { partNumber: "OF-1240", description: "Oil filter — standard spin-on", brand: "Motorcraft", category: "Filters", vendorName: "NAPA", quantityOnHand: 24, reorderPoint: 10, reorderQty: 20, costCents: dollars(7), retailCents: dollars(28), binLocation: "A1-01" },
  { partNumber: "OF-3517", description: "Oil filter — cartridge type", brand: "WIX", category: "Filters", vendorName: "WorldPac", quantityOnHand: 8, reorderPoint: 12, reorderQty: 24, costCents: dollars(9), retailCents: dollars(36), binLocation: "A1-02" },
  { partNumber: "AF-8832", description: "Engine air filter", brand: "Fram", category: "Filters", vendorName: "NAPA", quantityOnHand: 15, reorderPoint: 8, reorderQty: 16, costCents: dollars(12), retailCents: dollars(48), binLocation: "A1-03" },
  { partNumber: "CF-10234", description: "Cabin air filter", brand: "Bosch", category: "Filters", vendorName: "AutoZone Commercial", quantityOnHand: 6, reorderPoint: 10, reorderQty: 20, costCents: dollars(14), retailCents: dollars(56), binLocation: "A1-04" },
  { partNumber: "FUEL-FILTER", description: "Inline fuel filter", brand: "WIX", category: "Filters", vendorName: "NAPA", quantityOnHand: 5, reorderPoint: 6, reorderQty: 12, costCents: dollars(15), retailCents: dollars(60), binLocation: "A1-05" },
  { partNumber: "BP-5501-F", description: "Front brake pads — ceramic", brand: "Akebono", category: "Brakes", vendorName: "WorldPac", quantityOnHand: 4, reorderPoint: 6, reorderQty: 12, costCents: dollars(42), retailCents: dollars(168), binLocation: "B2-01" },
  { partNumber: "BP-5501-R", description: "Rear brake pads — ceramic", brand: "Akebono", category: "Brakes", vendorName: "WorldPac", quantityOnHand: 3, reorderPoint: 6, reorderQty: 12, costCents: dollars(38), retailCents: dollars(152), binLocation: "B2-02" },
  { partNumber: "BR-4410-F", description: "Front brake rotor", brand: "Raybestos", category: "Brakes", vendorName: "NAPA", quantityOnHand: 2, reorderPoint: 4, reorderQty: 8, costCents: dollars(55), retailCents: dollars(220), binLocation: "B2-03" },
  { partNumber: "BF-DOT3", description: "DOT 3 brake fluid — 32 oz", brand: "Prestone", category: "Fluids", vendorName: "NAPA", quantityOnHand: 18, reorderPoint: 6, reorderQty: 12, costCents: dollars(6), retailCents: dollars(24), binLocation: "C1-01" },
  { partNumber: "AF-PSF", description: "Power steering fluid — 12 oz", brand: "Valvoline", category: "Fluids", vendorName: "NAPA", quantityOnHand: 10, reorderPoint: 5, reorderQty: 10, costCents: dollars(5), retailCents: dollars(20), binLocation: "C1-02" },
  { partNumber: "CL-50-50", description: "Coolant — 50/50 prediluted gallon", brand: "Zerex", category: "Fluids", vendorName: "AutoZone Commercial", quantityOnHand: 12, reorderPoint: 8, reorderQty: 16, costCents: dollars(14), retailCents: dollars(56), binLocation: "C1-03" },
  { partNumber: "OIL-5W30-SYN", description: "5W-30 full synthetic — 5 qt", brand: "Mobil 1", category: "Fluids", vendorName: "NAPA", quantityOnHand: 20, reorderPoint: 10, reorderQty: 20, costCents: dollars(28), retailCents: dollars(112), binLocation: "C1-04" },
  { partNumber: "OIL-0W20-SYN", description: "0W-20 full synthetic — 5 qt", brand: "Pennzoil Platinum", category: "Fluids", vendorName: "WorldPac", quantityOnHand: 14, reorderPoint: 8, reorderQty: 16, costCents: dollars(32), retailCents: dollars(128), binLocation: "C1-05" },
  { partNumber: "SP-5224", description: "Spark plug — iridium", brand: "NGK", category: "Ignition", vendorName: "WorldPac", quantityOnHand: 32, reorderPoint: 16, reorderQty: 32, costCents: dollars(11), retailCents: dollars(44), binLocation: "D1-01" },
  { partNumber: "PCV-VALVE", description: "PCV valve", brand: "Standard", category: "Engine", vendorName: "NAPA", quantityOnHand: 7, reorderPoint: 5, reorderQty: 10, costCents: dollars(6), retailCents: dollars(24), binLocation: "D1-02" },
  { partNumber: "DRAIN-PLUG", description: "Oil drain plug gasket — universal", brand: "Dorman", category: "Engine", vendorName: "NAPA", quantityOnHand: 50, reorderPoint: 20, reorderQty: 100, costCents: dollars(1), retailCents: dollars(4), binLocation: "A2-01" },
  { partNumber: "SER-5060840", description: "Serpentine belt", brand: "Continental", category: "Belts & Hoses", vendorName: "NAPA", quantityOnHand: 5, reorderPoint: 4, reorderQty: 8, costCents: dollars(22), retailCents: dollars(88), binLocation: "D2-03" },
  { partNumber: "BAT-35-700", description: "Battery — Group 35 700 CCA", brand: "Interstate", category: "Electrical", vendorName: "NAPA", quantityOnHand: 4, reorderPoint: 3, reorderQty: 6, costCents: dollars(95), retailCents: dollars(380), binLocation: "E1-03" },
  { partNumber: "WIP-22", description: "Wiper blade — 22 in", brand: "Bosch", category: "Other", vendorName: "AutoZone Commercial", quantityOnHand: 14, reorderPoint: 8, reorderQty: 16, costCents: dollars(10), retailCents: dollars(40), binLocation: "H1-01" },
  { partNumber: "WIP-24", description: "Wiper blade — 24 in", brand: "Bosch", category: "Other", vendorName: "AutoZone Commercial", quantityOnHand: 11, reorderPoint: 8, reorderQty: 16, costCents: dollars(11), retailCents: dollars(44), binLocation: "H1-02" },
  { partNumber: "TB-KIT-001", description: "Timing belt kit w/ tensioner", brand: "Dayco", category: "Belts & Hoses", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 4, costCents: dollars(120), retailCents: dollars(480), binLocation: "D2-02" },
  { partNumber: "O2-234-4567", description: "O2 sensor — upstream", brand: "Denso", category: "Exhaust", vendorName: "WorldPac", quantityOnHand: 3, reorderPoint: 4, reorderQty: 8, costCents: dollars(45), retailCents: dollars(180), binLocation: "G1-01" },
];

const DEFAULT_SHOP_IDS = [CORE_QA_SHOP_ID, DEMO_SHOP_ID];

function parseShopArg(): string[] {
  const shopArg = process.argv.find((a) => a.startsWith("--shop="));
  if (shopArg) return [shopArg.split("=")[1]!.trim()];
  return DEFAULT_SHOP_IDS;
}

async function seedShop(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true },
  });
  if (!shop) {
    console.warn(`Shop ${shopId} not found — skipping.`);
    return { shopId, created: 0, skipped: 0, total: 0, lowStock: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const p of INVENTORY_PARTS) {
    const existing = await prisma.inventoryPart.findUnique({
      where: { shopId_partNumber: { shopId, partNumber: p.partNumber } },
      select: { id: true, active: true },
    });
    if (existing?.active) {
      skipped++;
      continue;
    }

    const part = await prisma.inventoryPart.create({
      data: { shopId, ...p },
    });
    if (p.quantityOnHand > 0) {
      await prisma.inventoryAdjustment.create({
        data: {
          shopId,
          partId: part.id,
          delta: p.quantityOnHand,
          reason: "Initial stock (inventory demo seed)",
        },
      });
    }
    created++;
  }

  const parts = await prisma.inventoryPart.findMany({
    where: { shopId, active: true },
    select: { quantityOnHand: true, reorderPoint: true },
  });
  const total = parts.length;
  const lowStockCount = parts.filter((row) => row.quantityOnHand <= row.reorderPoint).length;

  console.log(
    `${shop.name} (${shopId}): +${created} new, ${skipped} skipped, ${total} active parts (${lowStockCount} at/below reorder)`,
  );

  return { shopId, created, skipped, total, lowStock: lowStockCount };
}

async function main() {
  const shopIds = parseShopArg();
  console.log(`Seeding inventory demo for: ${shopIds.join(", ")}`);

  for (const shopId of shopIds) {
    await seedShop(shopId);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
