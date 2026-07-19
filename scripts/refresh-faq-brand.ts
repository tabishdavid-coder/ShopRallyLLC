/**
 * Safe one-shot refresh: sync global FAQ content from FAQ_SEED and update
 * platform admin stub user email to ShopRally branding. Does not wipe shops/ROs.
 *
 * Usage: npx tsx scripts/refresh-faq-brand.ts
 */
import { prisma } from "../src/db/client";
import { FAQ_SEED } from "../prisma/data/faqs";
import { BRAND } from "../src/lib/brand";

const PLATFORM_ADMIN_EMAIL = "hello@getshoprally.com";
const LEGACY_PLATFORM_ADMIN_EMAILS = [
  "platform@getshoprally.com",
  "platform@repairpilot.com",
  "platform@getrepairpilot.com",
];

async function refreshFaqs() {
  let created = 0;
  let updated = 0;

  for (const faq of FAQ_SEED) {
    const existing = await prisma.faqArticle.findUnique({
      where: { slug: faq.slug },
      select: { id: true, question: true, answer: true, category: true, sortOrder: true },
    });

    if (!existing) {
      await prisma.faqArticle.create({
        data: {
          slug: faq.slug,
          category: faq.category,
          question: faq.question,
          answer: faq.answer,
          sortOrder: faq.sortOrder,
          published: true,
        },
      });
      created++;
      continue;
    }

    const unchanged =
      existing.question === faq.question &&
      existing.answer === faq.answer &&
      existing.category === faq.category &&
      existing.sortOrder === faq.sortOrder;

    if (unchanged) continue;

    await prisma.faqArticle.update({
      where: { slug: faq.slug },
      data: {
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder,
        published: true,
      },
    });
    updated++;
  }

  return { created, updated, total: FAQ_SEED.length };
}

async function refreshPlatformAdminEmail() {
  const target = PLATFORM_ADMIN_EMAIL.toLowerCase();

  const legacyAdmins = await prisma.user.findMany({
    where: {
      isPlatformAdmin: true,
      email: { in: LEGACY_PLATFORM_ADMIN_EMAILS },
    },
    select: { id: true, email: true },
  });

  if (legacyAdmins.length === 0) {
    const current = await prisma.user.findFirst({
      where: { isPlatformAdmin: true, email: target },
      select: { id: true, email: true },
    });
    return { updated: 0, currentEmail: current?.email ?? null };
  }

  for (const admin of legacyAdmins) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { email: PLATFORM_ADMIN_EMAIL },
    });
  }

  return {
    updated: legacyAdmins.length,
    from: legacyAdmins.map((u) => u.email),
    currentEmail: PLATFORM_ADMIN_EMAIL,
  };
}

async function verify() {
  const faqs = await prisma.faqArticle.findMany({
    select: { slug: true, question: true, answer: true },
  });

  const staleFaqs = faqs.filter((f) =>
    /RepairPilot|repairpilot|getrepairpilot|support@repairpilot/i.test(
      `${f.question} ${f.answer}`,
    ),
  );

  const supportFaq = faqs.find((f) => f.slug === "support-contact");
  const shopRallyMentions = faqs.filter((f) =>
    /ShopRally/i.test(`${f.question} ${f.answer}`),
  ).length;

  const admin = await prisma.user.findFirst({
    where: { isPlatformAdmin: true },
    select: { email: true },
  });

  return {
    faqCount: faqs.length,
    staleFaqSlugs: staleFaqs.map((f) => f.slug),
    shopRallyMentions,
    supportHasHelloEmail: supportFaq?.answer.includes(BRAND.supportEmail) ?? false,
    platformAdminEmail: admin?.email ?? null,
  };
}

async function main() {
  console.log("Refreshing FAQ content and platform admin email…");
  console.log(`Brand: ${BRAND.name}, support: ${BRAND.supportEmail}`);

  const faqResult = await refreshFaqs();
  const adminResult = await refreshPlatformAdminEmail();
  const check = await verify();

  console.log("\nFAQ sync:");
  console.log(`  seed articles: ${faqResult.total}`);
  console.log(`  created: ${faqResult.created}`);
  console.log(`  updated: ${faqResult.updated}`);
  console.log(`  unchanged: ${faqResult.total - faqResult.created - faqResult.updated}`);

  console.log("\nPlatform admin:");
  if (adminResult.updated > 0) {
    console.log(`  updated ${adminResult.updated} user(s) from ${JSON.stringify(adminResult.from)} → ${adminResult.currentEmail}`);
  } else {
    console.log(`  no legacy email update needed (current: ${adminResult.currentEmail ?? check.platformAdminEmail ?? "none"})`);
  }

  console.log("\nVerification:");
  console.log(`  FAQ rows in DB: ${check.faqCount}`);
  console.log(`  FAQs mentioning ShopRally: ${check.shopRallyMentions}`);
  console.log(`  support-contact has ${BRAND.supportEmail}: ${check.supportHasHelloEmail}`);
  console.log(`  platform admin email: ${check.platformAdminEmail}`);
  if (check.staleFaqSlugs.length > 0) {
    console.warn(`  WARNING stale FAQ slugs: ${check.staleFaqSlugs.join(", ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
