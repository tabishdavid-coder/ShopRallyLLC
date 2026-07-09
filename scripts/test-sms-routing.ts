#!/usr/bin/env tsx
/**
 * Smoke-test inbound SMS shop routing (no Twilio call required).
 * Usage: npx tsx scripts/test-sms-routing.ts [+15551234567]
 */
import { PrismaClient } from "../src/generated/prisma";
import { digitsOf, phoneMatchKey } from "../src/lib/phone";

const prisma = new PrismaClient();

async function resolveShopForInbound(toPhone: string): Promise<string | null> {
  const toKey = phoneMatchKey(toPhone);
  if (toKey.length < 7) return null;

  const shops = await prisma.shop.findMany({
    where: { smsEnabled: true, twilioPhoneNumber: { not: null } },
    select: { id: true, twilioPhoneNumber: true },
  });

  for (const shop of shops) {
    if (shop.twilioPhoneNumber && phoneMatchKey(shop.twilioPhoneNumber) === toKey) {
      return shop.id;
    }
  }

  if (process.env.NODE_ENV === "production") return null;

  const configured = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!configured) return null;

  const fromKey = digitsOf(configured);
  if (toKey !== fromKey && !toKey.endsWith(fromKey.slice(-10))) {
    return null;
  }

  const demo = await prisma.shop.findFirst({
    where: { id: "shop_demo", status: "ACTIVE" },
    select: { id: true },
  });
  if (demo) return demo.id;

  const shop = await prisma.shop.findFirst({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return shop?.id ?? null;
}

async function main() {
  const to = process.argv[2] ?? "+15185550100";
  const shopId = await resolveShopForInbound(to);

  const shops = await prisma.shop.findMany({
    where: { smsEnabled: true, twilioPhoneNumber: { not: null } },
    select: { id: true, name: true, twilioPhoneNumber: true, smsEnabled: true },
  });

  console.log("Shops with SMS enabled:");
  for (const s of shops) {
    console.log(`  ${s.name} (${s.id}): ${s.twilioPhoneNumber}`);
  }

  console.log(`\nresolveShopForInbound("${to}") → ${shopId ?? "null"}`);
  if (shopId) {
    const shop = shops.find((s) => s.id === shopId);
    console.log(`Matched shop: ${shop?.name ?? shopId}`);
  } else {
    console.log("No shop matched (check twilioPhoneNumber + smsEnabled, or TWILIO_FROM_NUMBER dev fallback).");
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
