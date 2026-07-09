/** One-off: seed inventory parts for shop_demo without full reseed. */
import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();
const dollars = (d) => Math.round(d * 100);

const PARTS = [
  { partNumber: "OF-1240", description: "Oil filter — standard spin-on", brand: "Motorcraft", category: "Filters", vendorName: "NAPA", quantityOnHand: 24, reorderPoint: 10, reorderQty: 20, costCents: dollars(7), retailCents: dollars(28), binLocation: "A1-01" },
  { partNumber: "OF-3517", description: "Oil filter — cartridge type", brand: "WIX", category: "Filters", vendorName: "WorldPac", quantityOnHand: 8, reorderPoint: 12, reorderQty: 24, costCents: dollars(9), retailCents: dollars(36), binLocation: "A1-02" },
  { partNumber: "AF-8832", description: "Engine air filter", brand: "Fram", category: "Filters", vendorName: "NAPA", quantityOnHand: 15, reorderPoint: 8, reorderQty: 16, costCents: dollars(12), retailCents: dollars(48), binLocation: "A1-03" },
  { partNumber: "CF-10234", description: "Cabin air filter", brand: "Bosch", category: "Filters", vendorName: "AutoZone Commercial", quantityOnHand: 6, reorderPoint: 10, reorderQty: 20, costCents: dollars(14), retailCents: dollars(56), binLocation: "A1-04" },
  { partNumber: "BP-5501-F", description: "Front brake pads — ceramic", brand: "Akebono", category: "Brakes", vendorName: "WorldPac", quantityOnHand: 4, reorderPoint: 6, reorderQty: 12, costCents: dollars(42), retailCents: dollars(168), binLocation: "B2-01" },
  { partNumber: "BP-5501-R", description: "Rear brake pads — ceramic", brand: "Akebono", category: "Brakes", vendorName: "WorldPac", quantityOnHand: 3, reorderPoint: 6, reorderQty: 12, costCents: dollars(38), retailCents: dollars(152), binLocation: "B2-02" },
  { partNumber: "BR-4410-F", description: "Front brake rotor", brand: "Raybestos", category: "Brakes", vendorName: "NAPA", quantityOnHand: 2, reorderPoint: 4, reorderQty: 8, costCents: dollars(55), retailCents: dollars(220), binLocation: "B2-03" },
  { partNumber: "BF-DOT3", description: "DOT 3 brake fluid — 32 oz", brand: "Prestone", category: "Fluids", vendorName: "NAPA", quantityOnHand: 18, reorderPoint: 6, reorderQty: 12, costCents: dollars(6), retailCents: dollars(24), binLocation: "C1-01" },
  { partNumber: "AF-PSF", description: "Power steering fluid — 12 oz", brand: "Valvoline", category: "Fluids", vendorName: "NAPA", quantityOnHand: 10, reorderPoint: 5, reorderQty: 10, costCents: dollars(5), retailCents: dollars(20), binLocation: "C1-02" },
  { partNumber: "CL-50-50", description: "Coolant — 50/50 prediluted gallon", brand: "Zerex", category: "Fluids", vendorName: "AutoZone Commercial", quantityOnHand: 12, reorderPoint: 8, reorderQty: 16, costCents: dollars(14), retailCents: dollars(56), binLocation: "C1-03" },
  { partNumber: "OIL-5W30-SYN", description: "5W-30 full synthetic — 5 qt", brand: "Mobil 1", category: "Fluids", vendorName: "NAPA", quantityOnHand: 20, reorderPoint: 10, reorderQty: 20, costCents: dollars(28), retailCents: dollars(112), binLocation: "C1-04" },
  { partNumber: "SP-5224", description: "Spark plug — iridium", brand: "NGK", category: "Ignition", vendorName: "WorldPac", quantityOnHand: 32, reorderPoint: 16, reorderQty: 32, costCents: dollars(11), retailCents: dollars(44), binLocation: "D1-01" },
  { partNumber: "WP-9317", description: "Water pump", brand: "Gates", category: "Engine", vendorName: "WorldPac", quantityOnHand: 2, reorderPoint: 2, reorderQty: 4, costCents: dollars(85), retailCents: dollars(340), binLocation: "D2-01" },
  { partNumber: "TB-KIT-001", description: "Timing belt kit w/ tensioner", brand: "Dayco", category: "Belts & Hoses", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 4, costCents: dollars(120), retailCents: dollars(480), binLocation: "D2-02" },
  { partNumber: "SER-5060840", description: "Serpentine belt", brand: "Continental", category: "Belts & Hoses", vendorName: "NAPA", quantityOnHand: 5, reorderPoint: 4, reorderQty: 8, costCents: dollars(22), retailCents: dollars(88), binLocation: "D2-03" },
  { partNumber: "RAD-HOSE-UP", description: "Upper radiator hose", brand: "Dayco", category: "Belts & Hoses", vendorName: "NAPA", quantityOnHand: 3, reorderPoint: 4, reorderQty: 6, costCents: dollars(18), retailCents: dollars(72), binLocation: "D2-04" },
  { partNumber: "ALT-11345", description: "Alternator — reman", brand: "Denso", category: "Electrical", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 3, costCents: dollars(145), retailCents: dollars(580), binLocation: "E1-01" },
  { partNumber: "STR-44901", description: "Starter — reman", brand: "Bosch", category: "Electrical", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 3, costCents: dollars(130), retailCents: dollars(520), binLocation: "E1-02" },
  { partNumber: "BAT-35-700", description: "Battery — Group 35 700 CCA", brand: "Interstate", category: "Electrical", vendorName: "NAPA", quantityOnHand: 4, reorderPoint: 3, reorderQty: 6, costCents: dollars(95), retailCents: dollars(380), binLocation: "E1-03" },
  { partNumber: "SH-3412-F", description: "Front strut assembly", brand: "Monroe", category: "Suspension", vendorName: "WorldPac", quantityOnHand: 2, reorderPoint: 2, reorderQty: 4, costCents: dollars(110), retailCents: dollars(440), binLocation: "F1-01" },
  { partNumber: "CV-AX-4501", description: "CV axle shaft — front", brand: "GSP", category: "Suspension", vendorName: "WorldPac", quantityOnHand: 1, reorderPoint: 2, reorderQty: 4, costCents: dollars(75), retailCents: dollars(300), binLocation: "F1-02" },
  { partNumber: "O2-234-4567", description: "O2 sensor — upstream", brand: "Denso", category: "Exhaust", vendorName: "WorldPac", quantityOnHand: 3, reorderPoint: 4, reorderQty: 8, costCents: dollars(45), retailCents: dollars(180), binLocation: "G1-01" },
  { partNumber: "CAT-GASKET", description: "Catalytic converter gasket", brand: "Fel-Pro", category: "Exhaust", vendorName: "NAPA", quantityOnHand: 6, reorderPoint: 4, reorderQty: 8, costCents: dollars(8), retailCents: dollars(32), binLocation: "G1-02" },
  { partNumber: "DRAIN-PLUG", description: "Oil drain plug gasket — universal", brand: "Dorman", category: "Engine", vendorName: "NAPA", quantityOnHand: 50, reorderPoint: 20, reorderQty: 100, costCents: dollars(1), retailCents: dollars(4), binLocation: "A2-01" },
  { partNumber: "WIP-22", description: "Wiper blade — 22 in", brand: "Bosch", category: "Other", vendorName: "AutoZone Commercial", quantityOnHand: 14, reorderPoint: 8, reorderQty: 16, costCents: dollars(10), retailCents: dollars(40), binLocation: "H1-01" },
  { partNumber: "FUEL-FILTER", description: "Inline fuel filter", brand: "WIX", category: "Filters", vendorName: "NAPA", quantityOnHand: 5, reorderPoint: 6, reorderQty: 12, costCents: dollars(15), retailCents: dollars(60), binLocation: "A1-05" },
  { partNumber: "PCV-VALVE", description: "PCV valve", brand: "Standard", category: "Engine", vendorName: "NAPA", quantityOnHand: 7, reorderPoint: 5, reorderQty: 10, costCents: dollars(6), retailCents: dollars(24), binLocation: "D1-02" },
];

const shopId = "shop_demo";
const existing = await prisma.inventoryPart.count({ where: { shopId } });
if (existing > 0) {
  console.log(`Skip: ${existing} parts already seeded.`);
} else {
  for (const p of PARTS) {
    const part = await prisma.inventoryPart.create({ data: { shopId, ...p } });
    if (p.quantityOnHand > 0) {
      await prisma.inventoryAdjustment.create({
        data: { shopId, partId: part.id, delta: p.quantityOnHand, reason: "Initial stock (seed)" },
      });
    }
  }
  console.log(`Seeded ${PARTS.length} inventory parts.`);
}
await prisma.$disconnect();
