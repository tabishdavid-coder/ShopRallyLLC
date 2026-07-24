/**
 * Seed default OEM scraper sources into Postgres (platform-level).
 * Run: npm run oem:init-sources
 */
import { prisma } from "@/db/client";
import { seedScraperSources } from "@/server/platform/oem-automation";

async function main() {
  const count = await seedScraperSources();
  console.log(`Upserted ${count} scraper sources`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
