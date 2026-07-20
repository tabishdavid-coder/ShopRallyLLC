/**
 * Quick DB check: Macuto Core QA tenant exists and is STARTER.
 * Usage (from ShopRally root): node --env-file=.env scripts/verify-macuto-core.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

async function main() {
  let PrismaClient;
  try {
    ({ PrismaClient } = await import("../src/generated/prisma/index.js"));
  } catch {
    ({ PrismaClient } = require("@prisma/client"));
  }

  const prisma = new PrismaClient();
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: "shop_macuto" },
      select: {
        id: true,
        name: true,
        plan: true,
        billingStatus: true,
        status: true,
      },
    });
    const ro = await prisma.repairOrder.findUnique({
      where: { id: "ro_macuto_1001" },
      select: { id: true, number: true, shopId: true, status: true },
    });

    console.log(JSON.stringify({ shop, ro }, null, 2));

    if (!shop) {
      console.error("FAIL: shop_macuto missing — run npm run db:seed");
      process.exitCode = 1;
      return;
    }
    if (shop.plan !== "STARTER") {
      console.error(`FAIL: expected STARTER, got ${shop.plan}`);
      process.exitCode = 1;
      return;
    }
    console.log("OK: Macuto is Core (STARTER)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
