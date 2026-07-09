/**
 * Post-migration smoke test for data compliance tables/columns.
 * Run: npx tsx scripts/smoke-compliance.ts
 */
import { prisma } from "../src/db/client";
import { ShopAuditEventType } from "../src/generated/prisma";
import { activeCustomerWhere, CONSENT_DISCLOSURE_VERSION } from "../src/lib/data-compliance";

const MARKER_EMAIL = "compliance-smoke@karvio.local";

async function main() {
  const shop =
    (await prisma.shop.findFirst({ where: { id: "shop_demo" }, select: { id: true, name: true } })) ??
    (await prisma.shop.findFirst({
      where: { status: { in: ["ACTIVE", "TRIAL"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }));

  if (!shop) {
    console.error("FAIL: no shop found");
    process.exit(1);
  }

  console.log(`Shop: ${shop.name} (${shop.id})`);

  await prisma.customer.deleteMany({ where: { shopId: shop.id, email: MARKER_EMAIL } });

  const customer = await prisma.customer.create({
    data: {
      shopId: shop.id,
      firstName: "Compliance",
      lastName: "Smoke",
      email: MARKER_EMAIL,
      phone: "+15555550199",
      transactionalSmsConsent: true,
      marketingOptIn: false,
      marketingEmailConsent: true,
    },
    select: { id: true },
  });

  await prisma.consentRecord.createMany({
    data: [
      {
        shopId: shop.id,
        customerId: customer.id,
        channel: "sms",
        purpose: "transactional_sms",
        granted: true,
        disclosureVersion: CONSENT_DISCLOSURE_VERSION,
        source: "smoke_test",
      },
      {
        shopId: shop.id,
        customerId: customer.id,
        channel: "email",
        purpose: "marketing_email",
        granted: true,
        disclosureVersion: CONSENT_DISCLOSURE_VERSION,
        source: "smoke_test",
      },
    ],
  });

  const consentCount = await prisma.consentRecord.count({
    where: { shopId: shop.id, customerId: customer.id },
  });
  if (consentCount < 2) {
    console.error(`FAIL: expected consent records, got ${consentCount}`);
    process.exit(1);
  }
  console.log(`OK: ConsentRecord rows (${consentCount})`);

  await prisma.shopAuditEvent.create({
    data: {
      shopId: shop.id,
      eventType: ShopAuditEventType.CUSTOMER_CREATED,
      summary: "Smoke test customer created",
      metadata: { customerId: customer.id, smoke: true },
    },
  });

  const retentionAuditBefore = await prisma.shopAuditEvent.count({
    where: { shopId: shop.id, eventType: ShopAuditEventType.RETENTION_JOB_RUN },
  });

  const messageCutoff = new Date(Date.now() - 1095 * 86_400_000);
  const messagesPurged = await prisma.message.deleteMany({
    where: { shopId: shop.id, createdAt: { lt: messageCutoff } },
  });
  console.log(`OK: message purge query (${messagesPurged.count} rows)`);

  const retentionAuditAfter = await prisma.shopAuditEvent.count({
    where: { shopId: shop.id, eventType: ShopAuditEventType.RETENTION_JOB_RUN },
  });
  if (retentionAuditAfter !== retentionAuditBefore) {
    console.log("OK: RETENTION_JOB_RUN enum value writable");
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { deletedAt: new Date() },
  });

  const visible = await prisma.customer.count({
    where: { ...activeCustomerWhere(shop.id), id: customer.id },
  });
  if (visible !== 0) {
    console.error("FAIL: deleted customer still matches activeCustomerWhere");
    process.exit(1);
  }
  console.log("OK: soft-deleted customer hidden from active filter");

  await prisma.shopAuditEvent.deleteMany({
    where: { shopId: shop.id, metadata: { path: ["smoke"], equals: true } },
  });
  await prisma.consentRecord.deleteMany({ where: { customerId: customer.id } });
  await prisma.customer.delete({ where: { id: customer.id } });

  console.log("PASS: data compliance smoke test");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
