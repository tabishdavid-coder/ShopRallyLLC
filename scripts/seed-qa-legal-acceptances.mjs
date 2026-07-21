/**
 * Backfill current legal agreement acceptances for Core QA shops (additive only).
 * Use when agreement docs exist but LegalAcceptance rows are missing (e.g. DB seeded
 * before legal compliance landed, or acceptances were wiped).
 *
 * Usage (from ShopRally root):
 *   node --env-file=.env scripts/seed-qa-legal-acceptances.mjs
 *   node --env-file=.env scripts/seed-qa-legal-acceptances.mjs shop_macuto
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Must match REQUIRED_AGREEMENT_TYPES in src/server/legal.ts */
const REQUIRED_TYPES = ["PLATFORM_TOS", "PRIVACY_POLICY", "ACCEPTABLE_USE"];

const DEFAULT_SHOP_IDS = ["shop_macuto", "shop_demo"];

async function loadPrisma() {
  try {
    const mod = await import("../src/generated/prisma/index.js");
    return mod.PrismaClient;
  } catch {
    const mod = require("@prisma/client");
    return mod.PrismaClient;
  }
}

function acceptanceMatchesDocument(acceptance, doc) {
  return (
    acceptance.contentHash === doc.contentHash ||
    acceptance.agreementVersion === doc.version
  );
}

async function main() {
  const shopIds = process.argv.slice(2).length
    ? process.argv.slice(2)
    : DEFAULT_SHOP_IDS;

  const PrismaClient = await loadPrisma();
  const prisma = new PrismaClient();

  try {
    const docs = await prisma.agreementDocument.findMany({
      where: {
        isCurrent: true,
        type: { in: REQUIRED_TYPES },
      },
    });

    if (docs.length === 0) {
      console.error(
        "FAIL: no current agreement documents — run npm run db:seed first.",
      );
      process.exitCode = 1;
      return;
    }

    for (const shopId of shopIds) {
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: {
          id: true,
          name: true,
          legalEntityName: true,
          legalEntityState: true,
        },
      });
      if (!shop) {
        console.warn(`SKIP: ${shopId} not found`);
        continue;
      }

      const ownerMembership = await prisma.membership.findFirst({
        where: { shopId, role: "OWNER" },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
      if (!ownerMembership?.user) {
        console.warn(`SKIP: ${shopId} has no owner membership`);
        continue;
      }

      const user = ownerMembership.user;
      const signerName =
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        shop.legalEntityName ||
        shop.name;

      let created = 0;
      let alreadyCompliant = 0;

      for (const doc of docs) {
        const latest = await prisma.legalAcceptance.findFirst({
          where: { shopId, agreementType: doc.type },
          orderBy: { acceptedAt: "desc" },
        });

        if (latest && acceptanceMatchesDocument(latest, doc)) {
          alreadyCompliant += 1;
          continue;
        }

        await prisma.legalAcceptance.create({
          data: {
            shopId,
            userId: user.id,
            agreementType: doc.type,
            agreementVersion: doc.version,
            contentHash: doc.contentHash,
            signerName,
            signerTitle: "Owner",
            signerEmail: user.email,
            acceptanceMethod: "clickwrap_checkbox",
            metadata: {
              legalEntityName: shop.legalEntityName ?? shop.name,
              legalEntityState: shop.legalEntityState ?? null,
              seeded: true,
              script: "seed-qa-legal-acceptances.mjs",
            },
          },
        });
        created += 1;
      }

      console.log(
        `OK: ${shopId} — created ${created}, already current ${alreadyCompliant}/${docs.length}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
